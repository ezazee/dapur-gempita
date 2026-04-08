'use server';

import { Purchase, PurchaseItem, Ingredient, User, sequelize } from '@/models';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';

// Only ASLAP, ADMIN, and SUPER_ADMIN can create requests
async function checkPermission() {
    const session = await getSession();
    if (!session) return false;
    return ['ASLAP', 'SUPER_ADMIN', 'ADMIN'].includes(session.role);
}

export async function createOperationalRequest(data: {
    note?: string;
    items: {
        ingredientId?: string;
        name: string; // Used if NEW ingredient
        qty: number;
        unit: string;
    }[]
}) {
    const session = await getSession();
    if (!session || !await checkPermission()) {
        return { error: 'Permission denied. Only ASLAP can request operational goods.' };
    }

    if (!data.items || data.items.length === 0) {
        return { error: 'Item request cannot be empty' };
    }

    const t = await sequelize.transaction();

    try {
        // Create the purchase request
        const purchase = await Purchase.create({
            purchaseDate: new Date(),
            status: 'requested',
            purchaseType: 'OPERATIONAL', // Key differentiator
            totalItems: data.items.length,
            note: data.note || 'Request Barang Operasional dari ASLAP',
            createdBy: session.id
        }, { transaction: t });

        // Add items in parallel
        const itemPromises = data.items.map(async (item) => {
            let actualIngredientId = item.ingredientId;

            if (!actualIngredientId) {
                let ingredient = await Ingredient.findOne({
                    where: sequelize.where(
                        sequelize.fn('lower', sequelize.col('name')),
                        sequelize.fn('lower', item.name.trim())
                    ),
                    transaction: t
                });

                if (!ingredient) {
                    ingredient = await Ingredient.create({
                        name: item.name.trim(),
                        unit: item.unit,
                        category: 'OPERASIONAL',
                        currentStock: 0,
                        minimumStock: 5
                    }, { transaction: t });
                }
                actualIngredientId = ingredient.id;
            }

            return {
                purchaseId: purchase.id,
                ingredientId: actualIngredientId,
                estimatedQty: item.qty,
                targetQty: item.qty
            };
        });

        const purchaseItemsData = await Promise.all(itemPromises);
        await PurchaseItem.bulkCreate(purchaseItemsData, { transaction: t });

        await t.commit();
        revalidatePath('/operational-requests');
        revalidatePath('/purchases');
        return { success: true, data: purchase.id };

    } catch (error: any) {
        await t.rollback();
        console.error('Error creating operational request:', error);
        return { error: error.message || 'Failed to create operational request' };
    }
}

export async function updateOperationalRequest(id: string, data: {
    note?: string;
    items: {
        ingredientId?: string;
        name: string;
        qty: number;
        unit: string;
    }[]
}) {
    const session = await getSession();
    if (!session || !await checkPermission()) {
        return { error: 'Permission denied.' };
    }

    if (!data.items || data.items.length === 0) {
        return { error: 'Item request cannot be empty' };
    }

    const t = await sequelize.transaction();

    try {
        const purchase = await Purchase.findByPk(id, { transaction: t });

        if (!purchase) {
            await t.rollback();
            return { error: 'Request not found' };
        }

        if (purchase.status !== 'requested') {
            await t.rollback();
            return { error: 'Hanya request dengan status Menunggu yang dapat diedit' };
        }

        if (session.role === 'ASLAP' && purchase.createdBy !== session.id) {
            await t.rollback();
            return { error: 'Anda hanya dapat mengedit request Anda sendiri' };
        }

        await purchase.update({
            note: data.note,
            totalItems: data.items.length
        }, { transaction: t });

        // Delete old items
        await PurchaseItem.destroy({
            where: { purchaseId: id },
            transaction: t
        });

        // Add new items in parallel
        const itemPromises = data.items.map(async (item) => {
            let actualIngredientId = item.ingredientId;

            if (!actualIngredientId) {
                let ingredient = await Ingredient.findOne({
                    where: sequelize.where(
                        sequelize.fn('lower', sequelize.col('name')),
                        sequelize.fn('lower', item.name.trim())
                    ),
                    transaction: t
                });

                if (!ingredient) {
                    ingredient = await Ingredient.create({
                        name: item.name.trim(),
                        unit: item.unit,
                        category: 'OPERASIONAL',
                        currentStock: 0,
                        minimumStock: 5
                    }, { transaction: t });
                }
                actualIngredientId = ingredient.id;
            }

            return {
                purchaseId: purchase.id,
                ingredientId: actualIngredientId,
                estimatedQty: item.qty,
                targetQty: item.qty
            };
        });

        const purchaseItemsData = await Promise.all(itemPromises);
        await PurchaseItem.bulkCreate(purchaseItemsData, { transaction: t });

        await t.commit();
        revalidatePath('/operational-requests');
        revalidatePath('/purchases');
        return { success: true };

    } catch (error: any) {
        await t.rollback();
        console.error('Error updating operational request:', error);
        return { error: error.message || 'Failed to update operational request' };
    }
}


// ASLAP fetches their own operational requests
export async function getOperationalRequests(filters?: { startDate?: string; endDate?: string }) {
    const session = await getSession();
    if (!session || !['ASLAP', 'SUPER_ADMIN', 'ADMIN', 'KEPALA_DAPUR'].includes(session.role)) {
        return [];
    }

    try {
        const where: any = {
            purchaseType: 'OPERATIONAL'
        };

        if (filters?.startDate && filters?.endDate) {
            const { Op } = require('sequelize');
            const start = new Date(filters.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);

            where.createdAt = {
                [Op.between]: [start, end]
            };
        }

        const requests = await Purchase.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['name']
                },
                {
                    model: PurchaseItem,
                    as: 'items',
                    include: [{
                        model: Ingredient,
                        as: 'ingredient',
                        attributes: ['name', 'unit', 'category']
                    }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return requests.map((r: any) => ({
            id: r.id,
            purchaseDate: r.purchaseDate?.toISOString(),
            status: r.status,
            totalItems: r.totalItems,
            note: r.note,
            createdAt: r.createdAt?.toISOString(),
            creatorName: r.creator?.name || 'System',
            items: r.items?.map((item: any) => ({
                id: item.id,
                ingredientId: item.ingredientId,
                ingredientName: item.ingredient?.name,
                unit: item.ingredient?.unit,
                ingredientCategory: item.ingredient?.category,
                estimatedQty: item.estimatedQty,
                targetQty: item.targetQty,
                memo: item.memo?.replace(/^\[REQ:[^\]]+\]\s*/i, ''),
                photoUrl: item.photoUrl,
            })) || []
        }));
    } catch (error) {
        console.error('Error fetching operational requests:', error);
        return [];
    }
}
