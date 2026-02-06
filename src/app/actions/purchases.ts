'use server';

import { Purchase, PurchaseItem, Ingredient, User, AuditLog } from '@/models';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';

export async function getPurchases() {
    try {
        const purchases = await Purchase.findAll({
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

        // Serialize
        return purchases.map((p: any) => ({
            id: p.id,
            purchaseDate: p.purchaseDate.toISOString(),
            status: p.status,
            totalItems: p.totalItems,
            note: p.note,
            creatorName: p.creator?.name || 'Unknown',
            items: p.items.map((i: any) => ({
                id: i.id,
                ingredientId: i.ingredientId,
                ingredientName: i.ingredient.name,
                unit: i.ingredient.unit,
                estimatedQty: i.estimatedQty,
                photoUrl: i.photoUrl,
                memo: i.memo
            }))
        }));
    } catch (error) {
        console.error('Error fetching purchases:', error);
        return [];
    }
}

export async function createPurchase(data: { purchaseDate: Date; note: string; items: { ingredientId: string; qty: number; photoUrl?: string; memo?: string }[] }) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // PEMBELI or ADMIN
    if (!['PEMBELI', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const purchase = await Purchase.create({
            purchaseDate: data.purchaseDate,
            status: 'waiting', // Default to waiting for approval/receipt
            totalItems: data.items.length,
            note: data.note,
            createdBy: session.id
        });

        if (data.items.length > 0) {
            const items = data.items.map(i => ({
                purchaseId: purchase.id,
                ingredientId: i.ingredientId,
                estimatedQty: i.qty,
                photoUrl: i.photoUrl,
                memo: i.memo
            }));
            await PurchaseItem.bulkCreate(items);
        }

        revalidatePath('/purchases');
        return { success: true };
    } catch (error) {
        console.error('Error creating purchase:', error);
        return { error: 'Failed to create purchase' };
    }
}

export async function editPurchase(id: string, data: { note: string; items: { ingredientId: string; qty: number; photoUrl?: string; memo?: string }[] }) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    if (!['PEMBELI', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const purchase = await Purchase.findByPk(id);
        if (!purchase) return { error: 'Purchase not found' };

        if (purchase.status !== 'waiting') {
            return { error: 'Hanya pembelian dlm status Menunggu yang bisa diedit' };
        }

        // Update Note
        await purchase.update({
            note: data.note,
            totalItems: data.items.length
        });

        // Replace Items (Simplest strategy for "Update" is Delete All + Re-create, or Smart Diff)
        // For simplicity and correctness with "Checklist" behavior where user might remove items:
        await PurchaseItem.destroy({ where: { purchaseId: id } });

        if (data.items.length > 0) {
            const items = data.items.map(i => ({
                purchaseId: id,
                ingredientId: i.ingredientId,
                estimatedQty: i.qty,
                photoUrl: i.photoUrl,
                memo: i.memo
            }));
            await PurchaseItem.bulkCreate(items);
        }

        // Create Audit Log
        if (session) {
            await AuditLog.create({
                userId: session.id,
                action: 'UPDATE_PURCHASE',
                tableName: 'purchases',
                recordId: id,
                oldData: { note: purchase.note, totalItems: purchase.totalItems },
                newData: { note: data.note, totalItems: data.items.length }
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
        return { success: true };
    } catch (error) {
        console.error('Error deleting purchase:', error);
        return { error: 'Failed to delete purchase' };
    }
}
