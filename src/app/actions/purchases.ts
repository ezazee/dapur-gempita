'use server';

import { Purchase, PurchaseItem, Ingredient, User, AuditLog, Menu, sequelize } from '@/models';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';

export async function getPurchases(filters?: { startDate?: string; endDate?: string }) {
    try {
        const where: any = { purchaseType: 'FOOD' };

        if (filters?.startDate && filters?.endDate) {
            const { Op } = require('sequelize');
            const start = new Date(filters.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            where.purchaseDate = { [Op.between]: [start, end] };
        }

        const purchases = await Purchase.findAll({
            where,
            include: [
                { model: User, as: 'creator', attributes: ['name'] },
                {
                    model: PurchaseItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }]
                }
            ],
            order: [['purchaseDate', 'DESC']]
        });

        // Pre-fetch menus for the purchase dates to determine menu types for items
        const { Op } = require('sequelize');

        // Build an array of Op.between for each unique date
        const dateConditions = [...new Set(purchases.map((p: any) => {
            const d = new Date(p.purchaseDate);
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        }))].map(dateStr => {
            const [y, m, d] = dateStr.split('-');
            const startOfDay = new Date(parseInt(y), parseInt(m), parseInt(d), 0, 0, 0, 0);
            const endOfDay = new Date(parseInt(y), parseInt(m), parseInt(d), 23, 59, 59, 999);
            return {
                menuDate: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            };
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

        // Serialize
        return purchases.map((p: any) => {
            const pd = new Date(p.purchaseDate);
            const dateKey = `${pd.getFullYear()}-${pd.getMonth()}-${pd.getDate()}`;

            return {
                id: p.id,
                purchaseType: 'FOOD',
                purchaseDate: p.purchaseDate.toISOString(),
                status: p.status,
                totalItems: p.totalItems,
                note: p.note,
                creatorName: p.creator?.name || 'Unknown',
                items: p.items.map((i: any) => {
                    const types = typeMap[dateKey]?.[i.ingredientId] ? Array.from(typeMap[dateKey][i.ingredientId]) : [];
                    // If ingredient appears in ANY kering menu → classify as KERING
                    // Only OMPRENG if exclusively in masak menus or unknown
                    const menuType = types.includes('KERING') ? 'KERING' : 'OMPRENG';

                    return {
                        id: i.id,
                        ingredientId: i.ingredientId,
                        ingredientName: i.ingredient.name,
                        unit: i.ingredient.unit,
                        estimatedQty: i.estimatedQty,
                        targetQty: i.targetQty,
                        photoUrl: i.photoUrl,
                        memo: i.memo?.replace(/^\[REQ:[^\]]+\]\s*/i, ''),
                        menuType
                    };
                })
            };
        });
    } catch (error) {
        console.error('Error fetching purchases:', error);
        return [];
    }
}

export async function createPurchase(data: { purchaseDate: Date; note: string; purchaseType?: 'FOOD' | 'OPERATIONAL'; fulfilledRequestIds?: string[]; items: { ingredientId: string; name?: string; qty: number; targetQty?: number; photoUrl?: string; memo?: string }[] }) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // KEUANGAN or ADMIN
    if (!['KEUANGAN', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const status = data.items.some(item => {
            if (!item.targetQty) return false;
            const totalOfIng = data.items
                .filter(i => i.ingredientId === item.ingredientId)
                .reduce((sum, i) => sum + i.qty, 0);
            return totalOfIng < item.targetQty;
        }) ? 'incomplete' : 'waiting';

        const purchase = await Purchase.create({
            purchaseDate: data.purchaseDate,
            status,
            purchaseType: data.purchaseType || 'FOOD',
            totalItems: data.items.length,
            note: data.note,
            createdBy: session.id
        });

        if (data.items.length > 0) {
            const itemsToCreate = [];
            for (const i of data.items) {
                let actualIngredientId = i.ingredientId;

                // Handle ad-hoc operational items
                if (actualIngredientId === 'NEW' || !actualIngredientId) {
                    if (!i.name) continue; // Skip if no name provided

                    // Look for existing
                    let ingredient = await Ingredient.findOne({
                        where: sequelize.where(
                            sequelize.fn('lower', sequelize.col('name')),
                            sequelize.fn('lower', i.name)
                        )
                    });

                    // Create if not found
                    if (!ingredient) {
                        ingredient = await Ingredient.create({
                            name: i.name,
                            unit: 'pcs',
                            category: data.purchaseType === 'OPERATIONAL' ? 'OPERASIONAL' : 'MASAK',
                            currentStock: 0,
                            minimumStock: 5
                        });
                    }

                    actualIngredientId = ingredient.id;
                }

                itemsToCreate.push({
                    purchaseId: purchase.id,
                    ingredientId: actualIngredientId,
                    estimatedQty: i.qty,
                    targetQty: i.targetQty,
                    photoUrl: i.photoUrl,
                    memo: i.memo
                });
            }

            await PurchaseItem.bulkCreate(itemsToCreate);
        }

        if (data.fulfilledRequestIds && data.fulfilledRequestIds.length > 0) {
            // Delete the old requests that have been merged into this new purchase
            await PurchaseItem.destroy({ where: { purchaseId: data.fulfilledRequestIds } });
            await Purchase.destroy({ where: { id: data.fulfilledRequestIds } });
        }

        revalidatePath('/purchases');
        return { success: true };
    } catch (error) {
        console.error('Error creating purchase:', error);
        return { error: 'Failed to create purchase' };
    }
}

export async function editPurchase(id: string, data: { note: string; items: { ingredientId: string; qty: number; targetQty?: number; photoUrl?: string; memo?: string }[] }) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    if (!['KEUANGAN', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const purchase = await Purchase.findByPk(id);
        if (!purchase) return { error: 'Purchase not found' };

        if (purchase.status !== 'waiting' && purchase.status !== 'incomplete') {
            return { error: 'Hanya pembelian dlm status Menunggu atau Belum Lengkap yang bisa diedit' };
        }

        const status = data.items.some(item => {
            if (!item.targetQty) return false;
            const totalOfIng = data.items
                .filter(i => i.ingredientId === item.ingredientId)
                .reduce((sum, i) => sum + Number(i.qty), 0);
            return totalOfIng < Number(item.targetQty);
        }) ? 'incomplete' : 'waiting';

        // Update Note & Status
        await purchase.update({
            note: data.note,
            totalItems: data.items.length,
            status
        });

        // Replace Items (Simplest strategy for "Update" is Delete All + Re-create, or Smart Diff)
        // For simplicity and correctness with "Checklist" behavior where user might remove items:
        await PurchaseItem.destroy({ where: { purchaseId: id } });

        if (data.items.length > 0) {
            const items = data.items.map(i => ({
                purchaseId: id,
                ingredientId: i.ingredientId,
                estimatedQty: i.qty,
                targetQty: i.targetQty,
                photoUrl: i.photoUrl,
                memo: i.memo
            }));
            await PurchaseItem.bulkCreate(items);
        }

        // Create Audit Log with detailed changes
        if (session) {
            const ingredientIds = Array.from(new Set(data.items.map(i => i.ingredientId)));
            const ingredients = await Ingredient.findAll({
                where: { id: ingredientIds },
                attributes: ['id', 'name', 'unit']
            });
            const ingMap = Object.fromEntries(ingredients.map(i => [i.id, i.name]));
            const unitMap = Object.fromEntries(ingredients.map(i => [i.id, i.unit]));

            const oldItemsWithNames = await PurchaseItem.findAll({
                where: { purchaseId: id },
                include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }]
            });

            const changes: string[] = [];

            // Detect Added or Updated
            data.items.forEach(newItem => {
                const oldItem = oldItemsWithNames.find(oi => oi.ingredientId === newItem.ingredientId && oi.memo === newItem.memo);
                const name = ingMap[newItem.ingredientId] || 'Unknown';
                const unit = unitMap[newItem.ingredientId] || '';

                if (!oldItem) {
                    changes.push(`Tambah: ${name} (${newItem.qty} ${unit}) - ${newItem.memo || '-'}`);
                } else if (oldItem.estimatedQty !== newItem.qty) {
                    changes.push(`Update: ${name} (${oldItem.estimatedQty} -> ${newItem.qty} ${unit}) [${newItem.memo || '-'}]`);
                }
            });

            // Detect Removed
            oldItemsWithNames.forEach(oldItem => {
                const stillExists = data.items.some(ni => ni.ingredientId === oldItem.ingredientId && ni.memo === oldItem.memo);
                if (!stillExists) {
                    changes.push(`Hapus: ${(oldItem as any).ingredient?.name || 'Unknown'} - ${oldItem.memo || '-'}`);
                }
            });

            await AuditLog.create({
                userId: session.id,
                action: 'UPDATE_PURCHASE',
                tableName: 'purchases',
                recordId: id,
                oldData: { note: purchase.note, totalItems: purchase.totalItems },
                newData: {
                    note: data.note,
                    totalItems: data.items.length,
                    summary: changes.length > 0 ? changes.slice(0, 5) : ['Update data umum'], // Limit to 5 changes for UI readability
                    moreChanges: changes.length > 5 ? changes.length - 5 : 0
                }
            });
        }

        revalidatePath('/purchases');
        return { success: true };
    } catch (error) {
        console.error('Error editing purchase:', error);
        return { error: 'Failed to edit purchase' };
    }
}

export async function getPurchaseLogs(purchaseId: string) {
    try {
        const logs = await AuditLog.findAll({
            where: {
                tableName: 'purchases',
                recordId: purchaseId
            },
            include: [
                { model: User, as: 'user', attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        return logs.map((log: any) => ({
            id: log.id,
            action: log.action,
            userName: log.user?.name || 'Unknown',
            createdAt: log.createdAt.toISOString(),
            details: log.newData
        }));
    } catch (error) {
        console.error('Error fetching purchase logs:', error);
        return [];
    }
}

export async function deletePurchase(id: string) {
    try {
        const session = await getSession();
        if (!session) {
            return { error: 'Unauthorized' };
        }

        const purchase = await Purchase.findByPk(id);
        if (!purchase) {
            return { error: 'Purchase not found' };
        }

        // Delete associated items first
        await PurchaseItem.destroy({ where: { purchaseId: id } });

        // Delete purchase
        await purchase.destroy();

        revalidatePath('/purchases');
        revalidatePath('/operational-requests');
        return { success: true };
    } catch (error) {
        console.error('Error deleting purchase:', error);
        return { error: 'Failed to delete purchase' };
    }
}

export async function finalizePurchase(id: string) {
    const session = await getSession();
    if (!session || !['KEUANGAN', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const purchase = await Purchase.findByPk(id);
        if (!purchase) return { error: 'Purchase not found' };

        if (purchase.status !== 'incomplete') {
            return { error: 'Hanya pembelian Belum Lengkap yang bisa difinalisasi' };
        }

        await purchase.update({ status: 'waiting' });

        revalidatePath('/purchases');
        revalidatePath('/receipts');
        return { success: true };
    } catch (error) {
        console.error('Error finalizing purchase:', error);
        return { error: 'Failed to finalize purchase' };
    }
}

export async function getOperationalPurchases(filters?: { startDate?: string; endDate?: string }) {
    try {
        const where: any = { purchaseType: 'OPERATIONAL' };

        if (filters?.startDate && filters?.endDate) {
            const { Op } = require('sequelize');
            const start = new Date(filters.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            where.purchaseDate = { [Op.between]: [start, end] };
        }

        const purchases = await Purchase.findAll({
            where,
            include: [
                { model: User, as: 'creator', attributes: ['name'] },
                {
                    model: PurchaseItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit', 'category'] }]
                }
            ],
            order: [['purchaseDate', 'DESC']]
        });

        // Serialize
        return purchases.map((p: any) => ({
            id: p.id,
            purchaseType: p.purchaseType,
            purchaseDate: p.purchaseDate?.toISOString(),
            status: p.status,
            totalItems: p.totalItems,
            note: p.note,
            createdAt: p.createdAt?.toISOString(),
            creatorName: p.creator?.name || 'System',
            items: (p.items || []).map((item: any) => ({
                id: item.id,
                ingredientId: item.ingredientId,
                ingredientName: item.ingredient?.name,
                ingredientUnit: item.ingredient?.unit,
                ingredientCategory: item.ingredient?.category,
                estimatedQty: item.estimatedQty,
                targetQty: item.targetQty,
                memo: item.memo?.replace(/^\[REQ:[^\]]+\]\s*/i, '')
            }))
        }));
    } catch (error) {
        console.error('Error fetching operational purchases:', error);
        return [];
    }
}

export async function getPendingOperationalRequests(filters?: { startDate?: string; endDate?: string }) {
    try {
        const { Op } = require('sequelize');
        const where: any = {
            purchaseType: 'OPERATIONAL',
            status: 'requested'
        };

        if (filters?.startDate && filters?.endDate) {
            const start = new Date(filters.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            where.purchaseDate = { [Op.between]: [start, end] };
        }

        const purchases = await Purchase.findAll({
            where,
            include: [
                { model: User, as: 'creator', attributes: ['name'] },
                {
                    model: PurchaseItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit', 'category'] }]
                }
            ],
            order: [['purchaseDate', 'ASC']]
        });

        // Serialize
        return purchases.map((p: any) => ({
            id: p.id,
            purchaseType: p.purchaseType,
            purchaseDate: p.purchaseDate?.toISOString(),
            status: p.status,
            totalItems: p.totalItems,
            note: p.note,
            createdAt: p.createdAt?.toISOString(),
            creatorName: p.creator?.name || 'System',
            items: (p.items || []).map((item: any) => ({
                id: item.id,
                ingredientId: item.ingredientId, // NEEDED TO ADD TO FORM
                ingredientName: item.ingredient?.name,
                ingredientUnit: item.ingredient?.unit,
                ingredientCategory: item.ingredient?.category,
                estimatedQty: item.estimatedQty,
                targetQty: item.targetQty,
                memo: item.memo?.replace(/^\[REQ:[^\]]+\]\s*/i, '')
            }))
        }));
    } catch (error) {
        console.error('Error fetching pending operational requests:', error);
        return [];
    }
}

export async function getPendingFoodRequests() {
    try {
        const { Op } = require('sequelize');

        // Start of today
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const localDate = new Date(today.getTime() - offset);
        localDate.setUTCHours(0, 0, 0, 0);

        // 1. Fetch all future/today FOOD purchases
        const existingPurchases = await Purchase.findAll({
            attributes: ['purchaseDate'],
            where: {
                purchaseType: 'FOOD',
                purchaseDate: {
                    [Op.gte]: localDate
                }
            }
        });

        const purchasedDates = new Set(
            existingPurchases.map((p: any) => {
                const d = new Date(p.purchaseDate);
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            })
        );

        // 2. Fetch all future/today Menus
        const menus = await Menu.findAll({
            where: {
                menuDate: {
                    [Op.gte]: localDate
                }
            },
            include: [
                {
                    model: Ingredient,
                    as: 'ingredients',
                    through: { attributes: ['qtyNeeded'] }
                }
            ],
            order: [['menuDate', 'ASC']]
        });

        // 3. Group Menus by date and filter out dates that have purchases
        const pendingByDate = new Map<string, any>();

        menus.forEach((m: any) => {
            const d = new Date(m.menuDate);
            const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

            if (purchasedDates.has(dateStr)) return;

            if (!pendingByDate.has(dateStr)) {
                pendingByDate.set(dateStr, {
                    id: `food-req-${dateStr}`, // Synthetic ID
                    purchaseType: 'FOOD_REQUEST', // custom type for UI differentiation
                    purchaseDate: d.toISOString(),
                    status: 'requested',
                    creatorName: 'Ahli Gizi (Jadwal Masak)',
                    note: 'Jadwal Masak Ahli Gizi (Belum Dibelanjakan)',
                    itemsMap: new Map<string, any>(),
                    createdAt: d.toISOString()
                });
            }

            const req = pendingByDate.get(dateStr);

            m.ingredients.forEach((ing: any) => {
                const key = `${ing.id}-${m.menuType}`;
                if (req.itemsMap.has(key)) {
                    req.itemsMap.get(key).targetQty += (ing.MenuIngredient?.qtyNeeded || 0);
                    req.itemsMap.get(key).estimatedQty += (ing.MenuIngredient?.qtyNeeded || 0);
                } else {
                    const crypto = require('crypto');
                    req.itemsMap.set(key, {
                        id: crypto.randomUUID(),
                        ingredientId: ing.id,
                        ingredientName: ing.name,
                        ingredientUnit: ing.unit,
                        ingredientCategory: ing.category,
                        estimatedQty: ing.MenuIngredient?.qtyNeeded || 0,
                        targetQty: ing.MenuIngredient?.qtyNeeded || 0,
                        memo: m.menuType
                    });
                }
            });
        });

        // 4. Format into final array
        return Array.from(pendingByDate.values()).map(req => {
            const items = Array.from(req.itemsMap.values());
            return {
                ...req,
                totalItems: items.length,
                items,
                itemsMap: undefined // remove map from serialization
            };
        });

    } catch (error) {
        console.error('Error fetching pending food requests:', error);
        return [];
    }
}


