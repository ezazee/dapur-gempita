'use server';

import {
    Menu, Production, ProductionItem,
    Ingredient, MenuIngredient, StockMovement, User, sequelize
} from '@/models';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';
import { Op } from 'sequelize';

export async function getTodaysMenu() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const menu = await Menu.findOne({
            where: {
                menuDate: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            },
            include: [
                {
                    model: Ingredient,
                    as: 'ingredients',
                    through: { attributes: ['qtyNeeded'] }
                }
            ],
            order: [['menuDate', 'DESC']]
        });

        if (!menu) {
            return null;
        }

        // Cast to any to access ingredients
        const menuData = menu as any;

        // For each ingredient, get the current stock
        const ingredientsWithStock = await Promise.all(
            (menuData.ingredients || []).map(async (i: any) => {
                const ingredient = await Ingredient.findByPk(i.id);
                return {
                    id: i.id,
                    name: i.name,
                    unit: i.unit,
                    stdQty: i.menu_ingredients?.qtyNeeded || 0,
                    availableStock: ingredient?.currentStock || 0
                };
            })
        );

        return {
            id: menu.id,
            name: menu.name,
            date: menu.menuDate.toISOString(),
            ingredients: ingredientsWithStock
        };
    } catch (e) {
        console.error('[getTodaysMenu] Error:', e);
        return null;
    }
}

export async function createProduction(data: { menuId: string; totalPortions: number; note: string; photoUrl?: string; items: { ingredientId: string; qtyUsed: number }[] }) {
    const session = await getSession();
    if (!session || !['CHEF', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    const t = await sequelize.transaction();

    try {
        // 1. Create Production Record
        const production = await Production.create({
            productionDate: new Date(),
            menuId: data.menuId,
            totalPortions: data.totalPortions,
            note: data.note,
            photoUrl: data.photoUrl,
            createdBy: session.id
        }, { transaction: t });

        // 2. Process Items & Deduct Stock
        for (const item of data.items) {
            await ProductionItem.create({
                productionId: production.id,
                ingredientId: item.ingredientId,
                qtyUsed: item.qtyUsed
            }, { transaction: t });

            // 3. Update Ingredient Stock
            const ingredient = await Ingredient.findByPk(item.ingredientId, { transaction: t });
            if (ingredient) {
                // Check if enough stock?
                // Usually kitchen allows cooking even if system says 0 (data lag). But let's allow negative for now or warn.
                // We just deduct.
                await ingredient.update({
                    currentStock: ingredient.currentStock - item.qtyUsed
                }, { transaction: t });

                // 4. Create Stock Movement Log
                await StockMovement.create({
                    ingredientId: item.ingredientId,
                    type: 'OUT',
                    qty: item.qtyUsed,
                    balanceBefore: ingredient.currentStock + item.qtyUsed, // Logic: Before was higher
                    balanceAfter: ingredient.currentStock,
                    referenceTable: 'productions',
                    referenceId: production.id,
                    createdBy: session.id,
                    note: `Produksi Masakan (${production.totalPortions} porsi)`
                }, { transaction: t });
            }
        }

        await t.commit();
        revalidatePath('/productions');
        revalidatePath('/stock-movements');
        revalidatePath('/ingredients');

        return { success: true };

    } catch (error: any) {
        await t.rollback();
        console.error('Error creating production:', error);
        return { error: error.message || 'Failed to record production' };
    }
}

export async function getProductions() {
    try {
        const prods = await Production.findAll({
            include: [
                { model: Menu, as: 'menu', attributes: ['name'] },
                { model: User, as: 'chef', attributes: ['name'] },
                {
                    model: ProductionItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }]
                }
            ],
            order: [['productionDate', 'DESC']],
            limit: 20
        });
        return prods.map((p: any) => ({
            id: p.id,
            date: p.productionDate.toISOString(),
            menuName: p.menu?.name,
            portions: p.totalPortions,
            photoUrl: p.photoUrl,
            note: p.note,
            chefName: p.chef?.name,
            items: (p.items || []).map((item: any) => ({
                ingredientName: item.ingredient?.name || 'Unknown',
                unit: item.ingredient?.unit || 'kg',
                qtyUsed: item.qtyUsed
            }))
        }));
    } catch (e) {
        console.error('[getProductions] Error:', e);
        return [];
    }
}
