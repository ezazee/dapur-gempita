'use server';

import { Ingredient, sequelize } from '@/models';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { getSession } from './auth';

async function checkPermission(permission: string) {
    const session = await getSession();
    if (!session) return false;

    // Simple permission check logic mirrored from client or use role based
    if (session.role === 'SUPER_ADMIN') return true;

    // Specific roles for specific actions
    const permissions: Record<string, string[]> = {
        'SUPER_ADMIN': ['*'],
        'ADMIN': ['*'],
        'AHLI_GIZI': [],
        'ASLAP': ['stock.adjust', 'ingredient.read', 'ingredient.update'],
        'CHEF': ['ingredient.read']
    };

    const rolePerms = permissions[session.role] || [];
    return rolePerms.includes('*') || rolePerms.includes(permission);
}

export async function getIngredients(params?: { search?: string; category?: string; page?: number; pageSize?: number }) {
    const { Op } = require('sequelize');
    const search = params?.search?.trim().replace(/\s+/g, '%') || "";
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const offset = (page - 1) * pageSize;

    try {
        const whereClause: any = {};
        if (search) {
            whereClause.name = { [Op.iLike]: `%${search}%` };
        }
        if (params?.category) {
            whereClause.category = params.category;
        }

        const { rows, count } = await Ingredient.findAndCountAll({
            where: whereClause,
            order: [['name', 'ASC']],
            limit: pageSize,
            offset: offset,
            raw: true
        });

        return {
            data: rows.map((item: any) => ({
                ...item,
                createdAt: item.createdAt?.toISOString(),
                updatedAt: item.updatedAt?.toISOString(),
            })),
            total: count
        };
    } catch (error) {
        console.error('Error fetching ingredients:', error);
        throw new Error('Failed to fetch ingredients');
    }
}

export async function createIngredient(data: { name: string; unit: string; category?: string; minimumStock: number; currentStock?: number }) {
    if (!await checkPermission('ingredient.create')) throw new Error('Permission denied');
    try {
        // Normalize name: trim and replace multiple spaces with single space
        const normalizedName = data.name.replace(/\s+/g, ' ').trim();

        // Check if name already exists (case-insensitive)
        const existing = await Ingredient.findOne({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                normalizedName.toLowerCase()
            )
        });

        if (existing) {
            throw new Error(`Bahan baku dengan nama "${normalizedName}" sudah ada.`);
        }

        await Ingredient.create({
            name: normalizedName,
            unit: data.unit,
            category: data.category || 'MASAK',
            minimumStock: data.minimumStock,
            currentStock: data.currentStock || 0
        });
        revalidatePath('/ingredients');
        return { success: true };
    } catch (error) {
        console.error('Error creating ingredient:', error);
        return { error: 'Failed to create ingredient' };
    }
}

export async function updateIngredient(id: string, data: { name: string; unit: string; category?: string; minimumStock: number }) {
    const session = await getSession();
    if (!await checkPermission('ingredient.update') || !session) throw new Error('Permission denied');

    const { StockMovement, sequelize, Ingredient } = await import('@/models');
    const { Op } = require('sequelize');
    const t = await sequelize.transaction();

    try {
        const ingredient = await Ingredient.findByPk(id, { transaction: t });
        if (!ingredient) throw new Error('Ingredient not found');

        // Normalize name
        const normalizedName = data.name.replace(/\s+/g, ' ').trim();

        // Check if new name already exists for OTHER ingredients
        const existing = await Ingredient.findOne({
            where: {
                [Op.and]: [
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('name')),
                        normalizedName.toLowerCase()
                    ),
                    { id: { [Op.ne]: id } }
                ]
            },
            transaction: t
        });

        if (existing) {
            throw new Error(`Bahan baku dengan nama "${normalizedName}" sudah ada.`);
        }

        const oldUnit = ingredient.unit;
        const newUnit = data.unit;

        await ingredient.update({
            name: normalizedName,
            unit: data.unit,
            ...(data.category ? { category: data.category } : {}),
            minimumStock: data.minimumStock
        }, { transaction: t });

        // If unit changed, log it in stock movement for transparency
        if (oldUnit !== newUnit) {
            await StockMovement.create({
                ingredientId: id,
                type: 'ADJUST',
                qty: 0,
                balanceBefore: ingredient.currentStock,
                balanceAfter: ingredient.currentStock,
                note: `Perubahan Satuan: ${oldUnit} -> ${newUnit}`,
                createdBy: session.id
            }, { transaction: t });
        }

        await t.commit();
        revalidatePath('/ingredients');
        return { success: true };
    } catch (error) {
        if (t) await t.rollback();
        console.error('Error updating ingredient:', error);
        return { error: 'Failed to update ingredient' };
    }
}

export async function deleteIngredient(id: string) {
    if (!await checkPermission('ingredient.delete')) throw new Error('Permission denied');

    try {
        const deleted = await Ingredient.destroy({
            where: { id }
        });

        if (deleted === 0) return { error: 'Ingredient not found' };

        revalidatePath('/ingredients');
        return { success: true };
    } catch (error) {
        console.error('Error deleting ingredient:', error);
        return { error: 'Failed to delete ingredient' };
    }
}

export async function adjustStock(id: string, newQty: number, note: string) {
    const session = await getSession();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'ASLAP'].includes(session.role)) {
        throw new Error('Permission denied');
    }

    if (!note.trim()) throw new Error('Alasan penyesuaian wajib diisi');

    const { StockMovement, sequelize, Ingredient } = await import('@/models');
    const t = await sequelize.transaction();

    try {
        const ingredient = await Ingredient.findByPk(id, { transaction: t });
        if (!ingredient) throw new Error('Bahan tidak ditemukan');

        const balanceBefore = ingredient.currentStock;
        const balanceAfter = newQty;
        const diff = balanceAfter - balanceBefore;

        await ingredient.update({ currentStock: balanceAfter }, { transaction: t });

        await StockMovement.create({
            ingredientId: id,
            type: 'ADJUST',
            qty: diff,
            balanceBefore,
            balanceAfter,
            note: note,
            createdBy: session.id
        }, { transaction: t });

        await t.commit();
        revalidatePath('/ingredients');
        return { success: true };
    } catch (error: any) {
        await t.rollback();
        console.error('Error adjusting stock:', error);
        return { error: error.message || 'Failed to adjust stock' };
    }
}

export async function mergeDuplicateIngredients() {
    const session = await getSession();
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
        throw new Error('Permission denied');
    }

    const {
        Ingredient, MenuIngredient, RecipeIngredient,
        PurchaseItem, ReceiptItem, ProductionItem,
        StockMovement, sequelize
    } = await import('@/models');
    const { Op } = require('sequelize');

    const t = await sequelize.transaction();

    try {
        // 1. Get all ingredients
        const allIngredients = await Ingredient.findAll({ transaction: t });

        // 2. Group by name (case-insensitive & whitespace robust)
        const groups: Record<string, any[]> = {};
        allIngredients.forEach(item => {
            // Normalize: lowercase, trim, and replace all whitespace (including tabs/newlines) with a single space
            const normalizedName = item.name.toLowerCase().replace(/\s+/g, ' ').trim();
            if (!groups[normalizedName]) groups[normalizedName] = [];
            groups[normalizedName].push(item);
        });

        let mergedCount = 0;

        // 3. Process groups with duplicates
        for (const name in groups) {
            const group = groups[name];
            if (group.length <= 1) continue;

            // Sort to find survivor: prefer 'kg' or 'liter' or simply the first one
            const standardUnits = ['kg', 'liter'];
            const survivor = group.sort((a, b) => {
                const aStd = standardUnits.includes(a.unit.toLowerCase());
                const bStd = standardUnits.includes(b.unit.toLowerCase());
                if (aStd && !bStd) return -1;
                if (!aStd && bStd) return 1;
                return 0; // Keep order or use createdAt
            })[0];

            const others = group.filter(i => i.id !== survivor.id);
            const otherIds = others.map(o => o.id);

            // 4. Consolidate stock
            let totalStock = survivor.currentStock;
            let totalMinStock = survivor.minimumStock;

            for (const other of others) {
                totalStock += other.currentStock;
                totalMinStock = Math.max(totalMinStock, other.minimumStock);
            }

            await survivor.update({
                currentStock: totalStock,
                minimumStock: totalMinStock
            }, { transaction: t });

            // 5. Update references in all tables
            const tables = [
                MenuIngredient, RecipeIngredient,
                PurchaseItem, ReceiptItem,
                ProductionItem, StockMovement
            ];

            for (const Model of tables) {
                await (Model as any).update(
                    { ingredientId: survivor.id },
                    {
                        where: { ingredientId: { [Op.in]: otherIds } },
                        transaction: t
                    }
                );
            }

            // 6. Delete redundant records
            await Ingredient.destroy({
                where: { id: { [Op.in]: otherIds } },
                transaction: t
            });

            mergedCount++;
        }

        await t.commit();
        revalidatePath('/ingredients');
        return { success: true, count: mergedCount };
    } catch (error: any) {
        await t.rollback();
        console.error('Error merging ingredients:', error);
        return { error: error.message || 'Gagal menggabungkan bahan duplikat' };
    }
}

export async function getStockHistory(id: string) {
    const { StockMovement, User } = await import('@/models');
    try {
        const history = await StockMovement.findAll({
            where: { ingredientId: id },
            include: [{ model: User, as: 'creator', attributes: ['name'] }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        return history.map((h: any) => ({
            id: h.id,
            type: h.type,
            qty: h.qty,
            balanceBefore: h.balanceBefore,
            balanceAfter: h.balanceAfter,
            note: h.note,
            createdAt: h.createdAt.toISOString(),
            creatorName: h.creator?.name || 'System'
        }));
    } catch (error) {
        console.error('Error fetching stock history:', error);
        return [];
    }
}
