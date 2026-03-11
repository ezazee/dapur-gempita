'use server';

import {
    Purchase, PurchaseItem, Receipt, ReceiptItem,
    Ingredient, StockMovement, User, sequelize, Menu
} from '@/models'; // Ensure models are exported from index
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';

export async function getPendingPurchases() {
    try {
        // Fetch purchases that are 'waiting' to be received
        const purchases = await Purchase.findAll({
            where: { status: 'waiting' },
            include: [
                { model: User, as: 'creator', attributes: ['name'] },
                {
                    model: PurchaseItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }]
                }
            ],
            order: [['purchaseDate', 'ASC']]
        });

        // Build typeMap: dateKey → ingredientId → Set<menuType>
        const { Op } = require('sequelize');
        const dateConditions = [...new Set(purchases.map((p: any) => {
            const d = new Date(p.purchaseDate);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        }))].map(dateStr => {
            const [y, m, d] = dateStr.split('-');
            const startOfDay = new Date(parseInt(y), parseInt(m), parseInt(d), 0, 0, 0, 0);
            const endOfDay = new Date(parseInt(y), parseInt(m), parseInt(d), 23, 59, 59, 999);
            return { menuDate: { [Op.between]: [startOfDay, endOfDay] } };
        });

        const menus = await Menu.findAll({
            where: dateConditions.length > 0 ? { [Op.or]: dateConditions } as any : { id: '00000000-0000-0000-0000-000000000000' } as any,
            include: [{ model: Ingredient, as: 'ingredients', through: { attributes: [] } }]
        });

        const typeMap: Record<string, Record<string, Set<string>>> = {};
        menus.forEach((m: any) => {
            const d = new Date(m.menuDate);
            const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!typeMap[dateKey]) typeMap[dateKey] = {};
            m.ingredients.forEach((ing: any) => {
                if (!typeMap[dateKey][ing.id]) typeMap[dateKey][ing.id] = new Set();
                typeMap[dateKey][ing.id].add(m.menuType || 'OMPRENG');
            });
        });

        return purchases.map((p: any) => {
            const pd = new Date(p.purchaseDate);
            const dateKey = `${pd.getFullYear()}-${pd.getMonth()}-${pd.getDate()}`;
            return {
                id: p.id,
                purchaseDate: p.purchaseDate.toISOString(),
                status: p.status,
                note: p.note,
                creatorName: p.creator?.name,
                purchaseType: p.purchaseType,
                items: p.items.map((i: any) => {
                    const types = typeMap[dateKey]?.[i.ingredientId]
                        ? Array.from(typeMap[dateKey][i.ingredientId])
                        : [];
                    const menuType = p.purchaseType === 'OPERATIONAL' ? 'OPERATIONAL' : (types.includes('KERING') ? 'KERING' : 'OMPRENG');
                    return {
                        id: i.id,
                        ingredientId: i.ingredientId,
                        ingredientName: i.ingredient.name,
                        unit: i.ingredient.unit,
                        estimatedQty: i.estimatedQty,
                        targetQty: i.targetQty,
                        memo: i.memo?.replace(/^\[REQ:[^\]]+\]\s*/i, ''),
                        menuType
                    };
                })
            };
        });
    } catch (error) {
        console.error('Error fetching pending purchases:', error);
        return [];
    }
}


export async function getReceipts(filters?: {
    startDate?: string,
    endDate?: string,
    type?: 'MASAK' | 'OPERATIONAL',
    page?: number,
    pageSize?: number
}) {
    // Fetch history
    try {
        const { Op } = require('sequelize');
        const where: any = {};

        if (filters?.startDate && filters?.endDate) {
            where.receivedAt = {
                [Op.between]: [
                    new Date(filters.startDate + 'T00:00:00.000Z'),
                    new Date(filters.endDate + 'T23:59:59.999Z')
                ]
            };
        }

        const page = filters?.page || 1;
        const pageSize = filters?.pageSize || 10;
        const offset = (page - 1) * pageSize;

        const include: any[] = [
            { model: User, as: 'receiver', attributes: ['name'] },
            {
                model: Purchase,
                as: 'purchase',
                where: filters?.type ? {
                    purchaseType: filters.type === 'MASAK' ? 'FOOD' : 'OPERATIONAL'
                } : {}
            },
            {
                model: ReceiptItem,
                as: 'items',
                include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }]
            }
        ];

        const { count, rows: receipts } = await Receipt.findAndCountAll({
            where,
            include,
            order: [['receivedAt', 'DESC']],
            limit: pageSize,
            offset,
            distinct: true // Important for count accuracy with includes
        });

        return {
            data: receipts.map((r: any) => ({
                id: r.id,
                date: r.receivedAt.toISOString(),
                receiverName: r.receiver?.name,
                status: r.status,
                note: r.note,
                purchaseNote: r.purchase?.note,
                purchaseType: r.purchase?.purchaseType,
                items: r.items?.map((item: any) => ({
                    id: item.id,
                    ingredientId: item.ingredientId,
                    ingredientName: item.ingredient?.name || 'Unknown',
                    unit: item.ingredient?.unit || 'kg',
                    grossWeight: item.grossWeight,
                    netWeight: item.netWeight,
                    photoUrl: item.photoUrl
                })) || []
            })),
            meta: {
                total: count,
                page,
                pageSize,
                totalPages: Math.ceil(count / pageSize)
            }
        };
    } catch (e) {
        console.error('Error fetching receipts:', e);
        return { data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } };
    }
}

interface ReceiptData {
    purchaseId: string;
    note: string;
    items: {
        ingredientId: string;
        grossWeight: number;
        netWeight: number;
        photoUrl?: string;
    }[];
}

export async function createReceipt(data: ReceiptData) {
    const session = await getSession();
    if (!session || !['ASLAP', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    const t = await sequelize.transaction();

    try {
        // 1. Create Receipt Record
        const receipt = await Receipt.create({
            purchaseId: data.purchaseId,
            receivedAt: new Date(),
            receivedBy: session.id,
            status: 'accepted',
            note: data.note
        }, { transaction: t });

        // 2. Process Items & Update Stock
        for (const item of data.items) {
            const difference = item.netWeight; // If we compare to estimate, we can calc diff. 
            // For now, difference field in DB might mean diff from Purchase? Or just N/A.
            // Let's assume difference is 0 for now or calculate if we fetch purchase item again.

            await ReceiptItem.create({
                receiptId: receipt.id,
                ingredientId: item.ingredientId,
                grossWeight: item.grossWeight,
                netWeight: item.netWeight,
                photoUrl: item.photoUrl,
                differenceQty: 0 // Placeholder logic
            }, { transaction: t });

            // 3. Update Ingredient Stock
            const ingredient = await Ingredient.findByPk(item.ingredientId, { transaction: t });
            if (ingredient) {
                // Update Current Stock - Ensure numeric calculation
                const oldStock = Number(ingredient.currentStock) || 0;
                const addedStock = Number(item.netWeight) || 0;
                await ingredient.update({
                    currentStock: oldStock + addedStock
                }, { transaction: t });

                // 4. Create Stock Movement Log
                await StockMovement.create({
                    ingredientId: item.ingredientId,
                    type: 'IN',
                    qty: item.netWeight,
                    balanceBefore: ingredient.currentStock - item.netWeight, // since we just added it? No, wait. 
                    // Calculation: Before = current (old), After = current + new.
                    // But I just updated it. So current is new.
                    // Correct: balanceBefore: ingredient.currentStock - item.netWeight (assuming update happened)
                    // Wait, safely:
                    //   Old = X
                    //   New = X + Qty
                    //   Update DB to New.
                    //   Log: Before X, After New.
                    balanceAfter: ingredient.currentStock,
                    referenceTable: 'receipts',
                    referenceId: receipt.id,
                    createdBy: session.id,
                    note: `Penerimaan dari Pembelian (Receipt #${receipt.id.slice(0, 4)})`
                }, { transaction: t });
            }
        }

        // 5. Update Purchase Status
        await Purchase.update({ status: 'approved' }, {
            where: { id: data.purchaseId },
            transaction: t
        });

        await t.commit();
        revalidatePath('/receipts');
        revalidatePath('/purchases');
        revalidatePath('/ingredients'); // Stock updated

        return { success: true };
    } catch (error: any) {
        await t.rollback();
        console.error('Error creating receipt:', error);
        return { error: error.message || 'Failed to process receipt' };
    }
}
