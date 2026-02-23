'use server';

import { Menu, Ingredient, MenuIngredient, Role, sequelize } from '@/models';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';
import { Op } from 'sequelize';

export async function getMenus(startDate?: Date, endDate?: Date) {
    try {
        const whereClause: any = {};

        if (startDate && endDate) {
            // Ensure strict range inclusive
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            whereClause.menuDate = {
                [Op.between]: [start, end]
            };
        } else if (startDate) {
            // Fallback for single date strict
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(startDate);
            end.setHours(23, 59, 59, 999);
            whereClause.menuDate = {
                [Op.between]: [start, end]
            };
        }

        const menus = await Menu.findAll({
            where: whereClause,
            include: [
                {
                    model: Ingredient,
                    as: 'ingredients',
                    through: { attributes: ['qtyNeeded', 'gramasi', 'evaluationStatus', 'evaluationNote'] }
                }
            ],
            order: [['menuDate', 'DESC']]
        });

        // Serialize
        return menus.map((m: any) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            menuDate: m.menuDate.toISOString(),
            portionCount: m.portionCount,
            evaluation: m.evaluation,
            rating: m.rating,
            evaluatorId: m.evaluatorId,
            ingredients: m.ingredients.map((i: any) => ({
                id: i.id,
                name: i.name,
                unit: i.unit,
                // Access the join table attributes via the Model name (MenuIngredient)
                qtyNeeded: (i as any).MenuIngredient?.qtyNeeded || 0,
                gramasi: (i as any).MenuIngredient?.gramasi || null,
                evaluationStatus: (i as any).MenuIngredient?.evaluationStatus || null,
                evaluationNote: (i as any).MenuIngredient?.evaluationNote || null,
            }))
        }));
    } catch (error) {
        console.error('Error fetching menus:', error);
        return [];
    }
}

export async function createMenu(data: { name: string; description: string; menuDate: Date; portionCount: number; ingredients: { name: string; qty: number; gramasi?: number; unit: string }[] }) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Role check: Only AHLI_GIZI or ADMIN or CHEF
    if (!['AHLI_GIZI', 'SUPER_ADMIN', 'CHEF'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const menu = await Menu.create({
            name: data.name,
            description: data.description,
            menuDate: data.menuDate,
            portionCount: data.portionCount || 1,
            createdBy: session.id
        });

        // Add ingredients (Find or Create)
        if (data.ingredients.length > 0) {
            for (const item of data.ingredients) {
                // Check if ingredient exists by name (case insensitive)
                let ingredient = await Ingredient.findOne({
                    where: sequelize.where(
                        sequelize.fn('lower', sequelize.col('name')),
                        sequelize.fn('lower', item.name)
                    )
                });

                // If not exists, create it
                if (!ingredient) {
                    ingredient = await Ingredient.create({
                        name: item.name,
                        unit: item.unit,
                        currentStock: 0,
                        minimumStock: 10 // Default
                    });
                }

                // Link to Menu
                // Note: We currently don't store gramasi explicitly in MenuIngredient (only qtyNeeded which is Total)
                // But the UI reverse calculates it from Total / PortionCount.
                await MenuIngredient.create({
                    menuId: menu.id,
                    ingredientId: ingredient.id,
                    qtyNeeded: item.qty,
                    gramasi: item.gramasi
                });
            }
        }

        revalidatePath('/menus');
        return { success: true };
    } catch (error) {
        console.error('Error creating menu:', error);
        return { error: 'Failed to create menu' };
    }
}

export async function deleteMenu(id: string) {
    const session = await getSession();
    if (!session || !['AHLI_GIZI', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        await Menu.destroy({ where: { id } });
        revalidatePath('/menus');
        return { success: true };
    } catch (error) {
        return { error: 'Failed' };
    }
}


// For Ingredient Search in Menu Form
export async function searchIngredients(query: string) {
    try {
        const items = await Ingredient.findAll({
            where: {
                name: { [Op.iLike]: `%${query}%` }
            },
            limit: 10,
            raw: true
        });
        return items;
    } catch (e) {
        return [];
    }
}

export async function updateMenu(id: string, data: { name: string; description: string; menuDate: Date; portionCount: number; ingredients: { name: string; qty: number; gramasi?: number; unit: string }[] }) {
    const session = await getSession();
    if (!session || !['AHLI_GIZI', 'SUPER_ADMIN', 'CHEF'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const menu = await Menu.findByPk(id);
        if (!menu) return { error: 'Menu not found' };

        await menu.update({
            name: data.name,
            description: data.description,
            menuDate: data.menuDate,
            portionCount: data.portionCount || 1,
        });

        // Replace ingredients: Destroy old links, create new ones
        await MenuIngredient.destroy({ where: { menuId: id } });

        if (data.ingredients.length > 0) {
            for (const item of data.ingredients) {
                // Check if ingredient exists by name (case insensitive)
                let ingredient = await Ingredient.findOne({
                    where: sequelize.where(
                        sequelize.fn('lower', sequelize.col('name')),
                        sequelize.fn('lower', item.name)
                    )
                });

                // If not exists, create it
                if (!ingredient) {
                    ingredient = await Ingredient.create({
                        name: item.name,
                        unit: item.unit,
                        currentStock: 0,
                        minimumStock: 10
                    });
                }

                await MenuIngredient.create({
                    menuId: id,
                    ingredientId: ingredient.id,
                    qtyNeeded: item.qty,
                    gramasi: item.gramasi
                });
            }
        }

        revalidatePath('/menus');
        return { success: true };
    } catch (error) {
        console.error('Error updating menu:', error);
        return { error: 'Failed to update menu' };
    }
}


export async function getMenuIngredientsForDate(date: Date) {
    try {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const menus = await Menu.findAll({
            where: {
                menuDate: {
                    [Op.between]: [start, end]
                }
            },
            include: [
                {
                    model: Ingredient,
                    as: 'ingredients',
                    through: { attributes: ['qtyNeeded'] }
                }
            ]
        });

        // Aggregate ingredients
        const aggregated: Record<string, { id: string; name: string; unit: string; qty: number }> = {};

        menus.forEach((menu: any) => {
            menu.ingredients.forEach((ing: any) => {
                if (aggregated[ing.id]) {
                    aggregated[ing.id].qty += (ing.MenuIngredient?.qtyNeeded || 0);
                } else {
                    aggregated[ing.id] = {
                        id: ing.id,
                        name: ing.name,
                        unit: ing.unit,
                        qty: ing.MenuIngredient?.qtyNeeded || 0
                    };
                }
            });
        });

        return Object.values(aggregated);
    } catch (error) {
        console.error('Error fetching menu ingredients:', error);
        return [];
    }
}

export async function evaluateMenuIngredients(menuId: string, evaluations: { ingredientId: string; evaluationStatus: 'PAS' | 'KURANG' | 'BERLEBIH'; evaluationNote?: string }[]) {
    const session = await getSession();
    if (!session || !['AHLI_GIZI', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const menu = await Menu.findByPk(menuId);
        if (!menu) return { error: 'Menu not found' };

        // Process evaluations for each ingredient
        for (const evalData of evaluations) {
            const menuIngredient = await MenuIngredient.findOne({
                where: {
                    menuId: menuId,
                    ingredientId: evalData.ingredientId
                }
            });

            if (menuIngredient) {
                await menuIngredient.update({
                    evaluationStatus: evalData.evaluationStatus,
                    evaluationNote: evalData.evaluationNote || undefined,
                });
            }
        }

        // We can still mark the menu itself as "evaluated" by setting the evaluatorId
        await menu.update({
            evaluatorId: session.id
        });

        revalidatePath('/evaluations');
        revalidatePath('/menus');
        return { success: true };
    } catch (error) {
        console.error('Error evaluating menu ingredients:', error);
        return { error: 'Failed to evaluate ingredients' };
    }
}

export async function getMenuEvaluationStats(menuName: string, currentMenuDate: string) {
    const session = await getSession();
    if (!session || !['AHLI_GIZI', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied', status: 403 };
    }

    try {
        // Find latest menu with same name, before the current menu date, that has been evaluated
        const historyMenu = await Menu.findOne({
            where: {
                name: menuName,
                menuDate: { [Op.lt]: new Date(currentMenuDate) },
                evaluatorId: { [Op.ne]: null as any }
            },
            order: [['menuDate', 'DESC']],
            include: [{
                model: Ingredient,
                as: 'ingredients',
                through: { attributes: ['qtyNeeded', 'gramasi', 'evaluationStatus', 'evaluationNote'] }
            }]
        });

        if (!historyMenu) {
            return { data: null }; // No history found
        }

        // Process statistics
        const ingredients = historyMenu.get('ingredients') as any[];
        let total = 0;
        let pas = 0;
        let kurang = 0;
        let berlebih = 0;

        const issues: any[] = [];

        ingredients.forEach((ing: any) => {
            const status = ing.MenuIngredient.evaluationStatus;
            const note = ing.MenuIngredient.evaluationNote;

            if (status) {
                total++;
                if (status === 'PAS') pas++;
                else if (status === 'KURANG') {
                    kurang++;
                    issues.push({ ingredientName: ing.name, status, note, qty: ing.MenuIngredient.qtyNeeded, unit: ing.unit });
                }
                else if (status === 'BERLEBIH') {
                    berlebih++;
                    issues.push({ ingredientName: ing.name, status, note, qty: ing.MenuIngredient.qtyNeeded, unit: ing.unit });
                }
            }
        });

        return {
            success: true,
            data: {
                date: historyMenu.get('menuDate'),
                portionCount: historyMenu.get('portionCount'),
                stats: {
                    total,
                    pas,
                    kurang,
                    berlebih,
                    percentages: {
                        pas: total > 0 ? Math.round((pas / total) * 100) : 0,
                        kurang: total > 0 ? Math.round((kurang / total) * 100) : 0,
                        berlebih: total > 0 ? Math.round((berlebih / total) * 100) : 0,
                    }
                },
                issues
            }
        };

    } catch (error) {
        console.error('Error fetching menu history stats:', error);
        return { error: 'Failed to fetch history stats', status: 500 };
    }
}
