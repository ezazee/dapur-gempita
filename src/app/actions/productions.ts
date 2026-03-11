'use server';

import {
    Menu, Production, ProductionItem,
    Ingredient, MenuIngredient, StockMovement, User, sequelize
} from '@/models';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';
import { Op } from 'sequelize';

export async function getTodaysMenus(menuId?: string) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const where: any = menuId ? { id: menuId } : {
            menuDate: {
                [Op.gte]: today,
                [Op.lt]: tomorrow
            }
        };

        const menus = await Menu.findAll({
            where,
            include: [
                {
                    model: Ingredient,
                    as: 'ingredients',
                    through: { attributes: ['qtyNeeded'] }
                }
            ],
            order: [['menuDate', 'DESC']]
        });

        const todayProductions = await Production.findAll({
            where: {
                productionDate: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            }
        });

        const completedMenuIds = new Set(todayProductions.map(p => p.menuId));

        const results = await Promise.all(menus.map(async (menu) => {
            // Cast to any to access ingredients
            const menuData = menu as any;

            // For each ingredient, get the current stock
            const ingredientsWithStock = await Promise.all(
                (menuData.ingredients || []).map(async (i: any) => {
                    const ingredient = await Ingredient.findByPk(i.id);
                    const stock = ingredient?.currentStock || 0;
                    return {
                        id: i.id,
                        name: i.name,
                        unit: i.unit,
                        stdQty: i.MenuIngredient?.qtyNeeded || 0,
                        availableStock: stock
                    };
                })
            );

            return {
                id: menu.id,
                name: menu.name,
                menuType: menu.menuType,
                date: menu.menuDate.toISOString(),
                description: menu.description,
                portionCount: (menu.countKecil || 0) + (menu.countBesar || 0) + (menu.countBumil || 0) + (menu.countBalita || 0),
                countKecil: menu.countKecil || 0,
                countBesar: menu.countBesar || 0,
                countBumil: menu.countBumil || 0,
                countBalita: menu.countBalita || 0,
                nutritionData: menu.nutritionData || {},
                isCompleted: completedMenuIds.has(menu.id),
                ingredients: ingredientsWithStock
            };
        }));

        return results;
    } catch (e) {
        console.error('[getTodaysMenus] Error:', e);
        return [];
    }
}

export async function createProduction(submissions: {
    menuId: string;
    countKecil: number;
    countBesar: number;
    countBumil: number;
    countBalita: number;
    totalPortions: number;
    note: string;
    photoUrl?: string;
    items: { ingredientId: string; qtyUsed: number }[]
}[]) {
    const session = await getSession();
    if (!session || !['CHEF', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    const t = await sequelize.transaction();

    try {
        for (const data of submissions) {
            // 1. Create Production Record
            const production = await Production.create({
                productionDate: new Date(),
                menuId: data.menuId,
                countKecil: data.countKecil,
                countBesar: data.countBesar,
                countBumil: data.countBumil,
                countBalita: data.countBalita,
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
                    await ingredient.update({
                        currentStock: ingredient.currentStock - item.qtyUsed
                    }, { transaction: t });

                    // 4. Create Stock Movement Log
                    await StockMovement.create({
                        ingredientId: item.ingredientId,
                        type: 'OUT',
                        qty: item.qtyUsed,
                        balanceBefore: ingredient.currentStock + item.qtyUsed,
                        balanceAfter: ingredient.currentStock,
                        referenceTable: 'productions',
                        referenceId: production.id,
                        createdBy: session.id,
                        note: `Produksi Masakan (${production.totalPortions} porsi)`
                    }, { transaction: t });
                }
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

export async function getProductions(startDate?: string, endDate?: string) {
    try {
        const where: any = {};

        if (startDate && endDate) {
            // Jakarta Timezone handling (UTC+7)
            const jakartaOffset = 7 * 60; // 7 hours in minutes
            const localOffset = new Date().getTimezoneOffset(); // minutes (negative for UTC+7)

            const startD = new Date(startDate);
            startD.setHours(0, 0, 0, 0);
            const dbStart = new Date(startD.getTime() - (jakartaOffset + localOffset) * 60000);

            const endD = new Date(endDate);
            endD.setHours(23, 59, 59, 999);
            const dbEnd = new Date(endD.getTime() - (jakartaOffset + localOffset) * 60000);

            where.productionDate = {
                [Op.between]: [dbStart, dbEnd]
            };
        }

        const prods = await Production.findAll({
            where,
            include: [
                { model: Menu, as: 'menu', attributes: ['name', 'menuType', 'description'] },
                { model: User, as: 'chef', attributes: ['name'] },
                {
                    model: ProductionItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }]
                }
            ],
            order: [['productionDate', 'DESC']],
            limit: startDate ? undefined : 20
        });
        return prods.map((p: any) => ({
            id: p.id,
            date: p.productionDate.toISOString(),
            menuName: p.menu?.name,
            menuType: p.menu?.menuType,
            description: p.menu?.description,
            countKecil: p.countKecil,
            countBesar: p.countBesar,
            countBumil: p.countBumil,
            countBalita: p.countBalita,
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
export async function getProductionById(id: string) {
    try {
        const p = await Production.findByPk(id, {
            include: [
                { model: Menu, as: 'menu', attributes: ['name', 'menuType', 'description'] },
                { model: User, as: 'chef', attributes: ['name'] },
                {
                    model: ProductionItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }]
                }
            ]
        });

        if (!p) return null;

        const prod = p as any;
        return {
            id: prod.id,
            date: prod.productionDate.toISOString(),
            menuName: prod.menu?.name,
            menuType: prod.menu?.menuType,
            description: prod.menu?.description,
            countKecil: prod.countKecil,
            countBesar: prod.countBesar,
            countBumil: prod.countBumil,
            countBalita: prod.countBalita,
            portions: prod.totalPortions,
            photoUrl: prod.photoUrl,
            note: prod.note,
            chefName: prod.chef?.name,
            items: (prod.items || []).map((item: any) => ({
                ingredientName: item.ingredient?.name || 'Unknown',
                unit: item.ingredient?.unit || 'kg',
                qtyUsed: item.qtyUsed
            }))
        };
    } catch (e) {
        console.error('[getProductionById] Error:', e);
        return null;
    }
}
