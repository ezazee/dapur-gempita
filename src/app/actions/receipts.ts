'use server';

import {
    Purchase, PurchaseItem, Receipt, ReceiptItem,
    Ingredient, StockMovement, User, sequelize
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

        return purchases.map((p: any) => ({
            id: p.id,
            purchaseDate: p.purchaseDate.toISOString(),
            status: p.status,
            note: p.note,
            creatorName: p.creator?.name,
            items: p.items.map((i: any) => ({
                id: i.id, // Purchase Item ID
                ingredientId: i.ingredientId,
                ingredientName: i.ingredient.name,
                unit: i.ingredient.unit,
                estimatedQty: i.estimatedQty
            }))
        }));
    } catch (error) {
        console.error('Error fetching pending purchases:', error);
        return [];
    }
}

export async function getReceipts() {
    // Fetch history
    try {
        const receipts = await Receipt.findAll({
            include: [
                { model: User, as: 'receiver', attributes: ['name'] },
                { model: Purchase, as: 'purchase' },
                {
                    model: ReceiptItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }]
                }
            ],
            order: [['receivedAt', 'DESC']],
            limit: 20
        });
        return receipts.map((r: any) => ({
            id: r.id,
            date: r.receivedAt.toISOString(),
            receiverName: r.receiver?.name,
            status: r.status,
            note: r.note,
            purchaseNote: r.purchase?.note,
            items: r.items?.map((item: any) => ({
                id: item.id,
                ingredientId: item.ingredientId,
                ingredientName: item.ingredient?.name || 'Unknown',
                unit: item.ingredient?.unit || 'kg',
                grossWeight: item.grossWeight,
                netWeight: item.netWeight,
                photoUrl: item.photoUrl
            })) || []
        }));
    } catch (e) {
        console.error('Error fetching receipts:', e);
        return [];
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
    if (!session || !['PENERIMA', 'SUPER_ADMIN'].includes(session.role)) {
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
                // Update Current Stock
                await ingredient.update({
                    currentStock: ingredient.currentStock + item.netWeight
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
