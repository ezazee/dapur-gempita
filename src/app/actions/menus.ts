'use server';

import { Menu, Ingredient, MenuIngredient, Role, sequelize } from '@/models';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';
import { Op } from 'sequelize';
import { denormalizeQty } from '@/lib/utils';

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

        const { Production } = await import('@/models');
        const menus = await Menu.findAll({
            where: whereClause,
            include: [
                {
                    model: Ingredient,
                    as: 'ingredients',
                    through: { attributes: ['id', 'qtyNeeded', 'gramasi', 'qtyBesar', 'qtyKecil', 'qtyBumil', 'qtyBalita', 'isSecukupnya', 'evaluationStatus', 'evaluationNote'] }
                },
                {
                    model: Production,
                    as: 'productions',
                    attributes: ['id']
                }
            ],
            order: [['menuDate', 'DESC']]
        });

        // Serialize
        return menus.map((m: any) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            menuType: m.menuType || 'OMPRENG',
            nutritionData: m.nutritionData || {},
            menuDate: m.menuDate.toISOString(),
            countKecil: m.countKecil,
            countBesar: m.countBesar,
            countBumil: m.countBumil,
            countBalita: m.countBalita,
            evaluation: m.evaluation,
            rating: m.rating,
            evaluatorId: m.evaluatorId,
            editHistory: m.editHistory || [],
            productionCount: m.productions?.length || 0,
            ingredients: m.ingredients.map((i: any) => {
                // Defensive check for join table data (handles minification mangling)
                const details = (i as any).MenuIngredient || (i as any).menuIngredientData || (i as any).menu_ingredients || {};
                
                return {
                    id: i.id,
                    miId: details.id,
                    menuId: m.id,
                    name: i.name,
                    unit: i.unit,
                    currentStock: i.currentStock,
                    qtyNeeded: details.qtyNeeded ?? 0,
                    gramasi: details.gramasi ?? null,
                    qtyBesar: details.qtyBesar ?? 0,
                    qtyKecil: details.qtyKecil ?? 0,
                    qtyBumil: details.qtyBumil ?? 0,
                    qtyBalita: details.qtyBalita ?? 0,
                    isSecukupnya: details.isSecukupnya ?? false,
                    evaluationStatus: details.evaluationStatus || null,
                    evaluationNote: details.evaluationNote || null,
                };
            })
        }));
    } catch (error) {
        console.error('Error fetching menus:', error);
        return [];
    }
}

export async function createMenu(data: {
    name: string;
    description: string;
    menuType: 'OMPRENG' | 'KERING';
    nutritionData?: any;
    menuDate: Date;
    countKecil: number;
    countBesar: number;
    countBumil: number;
    countBalita: number;
    ingredients: {
        name: string;
        qty: number;
        gramasi?: number;
        qtyBesar?: number;
        qtyKecil?: number;
        qtyBumil?: number;
        qtyBalita?: number;
        unit: string;
        isSecukupnya?: boolean;
    }[]
}) {
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
            menuType: data.menuType || 'OMPRENG',
            nutritionData: data.nutritionData,
            menuDate: data.menuDate,
            countKecil: data.countKecil || 0,
            countBesar: data.countBesar || 0,
            countBumil: data.countBumil || 0,
            countBalita: data.countBalita || 0,
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
                        minimumStock: 10, // Default
                        category: data.menuType === 'KERING' ? 'KERING' : 'MASAK'
                    });
                }

                let finalQty = item.qty;
                let finalGramasi = item.gramasi;
                // Always carry forward the portion values - default to 0 if not provided
                let finalQtyBesar = Number(item.qtyBesar) || 0;
                let finalQtyKecil = Number(item.qtyKecil) || 0;
                let finalQtyBumil = Number(item.qtyBumil) || 0;
                let finalQtyBalita = Number(item.qtyBalita) || 0;

                if (item.unit && ingredient.unit && item.unit.toLowerCase() !== ingredient.unit.toLowerCase()) {
                    finalQty = denormalizeQty(item.qty, item.unit, ingredient.unit);
                    if (item.gramasi) finalGramasi = denormalizeQty(item.gramasi, item.unit, ingredient.unit);
                    if (item.qtyBesar) finalQtyBesar = denormalizeQty(item.qtyBesar, item.unit, ingredient.unit);
                    if (item.qtyKecil) finalQtyKecil = denormalizeQty(item.qtyKecil, item.unit, ingredient.unit);
                    if (item.qtyBumil) finalQtyBumil = denormalizeQty(item.qtyBumil, item.unit, ingredient.unit);
                    if (item.qtyBalita) finalQtyBalita = denormalizeQty(item.qtyBalita, item.unit, ingredient.unit);
                }

                // Link to Menu
                await MenuIngredient.create({
                    menuId: menu.id,
                    ingredientId: ingredient.id,
                    qtyNeeded: finalQty,
                    gramasi: finalGramasi,
                    qtyBesar: finalQtyBesar,
                    qtyKecil: finalQtyKecil,
                    qtyBumil: finalQtyBumil,
                    qtyBalita: finalQtyBalita,
                    isSecukupnya: item.isSecukupnya || false
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
export async function searchIngredients(query: string, category?: string) {
    try {
        const fuzzyQuery = query.trim().replace(/\s+/g, '%');
        const whereClause: any = {
            name: { [Op.iLike]: `%${fuzzyQuery}%` }
        };

        if (category) {
            whereClause.category = category;
        }

        const items = await Ingredient.findAll({
            where: whereClause,
            limit: 10,
            raw: true
        });
        return items;
    } catch (e) {
        return [];
    }
}

export async function updateMenu(id: string, data: {
    name: string;
    description: string;
    menuType: 'OMPRENG' | 'KERING';
    nutritionData?: any;
    menuDate: Date;
    countKecil: number;
    countBesar: number;
    countBumil: number;
    countBalita: number;
    ingredients: {
        name: string;
        qty: number;
        gramasi?: number;
        unit: string;
        qtyBesar?: number;
        qtyKecil?: number;
        qtyBumil?: number;
        qtyBalita?: number;
        isSecukupnya?: boolean;
    }[]
}) {
    const session = await getSession();
    if (!session || !['AHLI_GIZI', 'SUPER_ADMIN', 'CHEF'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const menu = await Menu.findByPk(id);
        if (!menu) return { error: 'Menu not found' };

        const newHistoryEntry = {
            timestamp: new Date().toISOString(),
            editorName: session.name || session.email || 'Unknown User',
            editorRole: session.role
        };
        const currentHistory = menu.editHistory && Array.isArray(menu.editHistory) ? menu.editHistory : [];
        const updatedHistory = [...currentHistory, newHistoryEntry];

        await menu.update({
            name: data.name,
            description: data.description,
            menuType: data.menuType || 'OMPRENG',
            nutritionData: data.nutritionData,
            menuDate: data.menuDate,
            countKecil: data.countKecil || 0,
            countBesar: data.countBesar || 0,
            countBumil: data.countBumil || 0,
            countBalita: data.countBalita || 0,
            editHistory: updatedHistory
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
                        minimumStock: 10,
                        category: data.menuType === 'KERING' ? 'KERING' : 'MASAK'
                    });
                }

                let finalQty = item.qty;
                let finalGramasi = item.gramasi;
                // Always carry forward the portion values - default to 0 if not provided
                let finalQtyBesar = Number(item.qtyBesar) || 0;
                let finalQtyKecil = Number(item.qtyKecil) || 0;
                let finalQtyBumil = Number(item.qtyBumil) || 0;
                let finalQtyBalita = Number(item.qtyBalita) || 0;

                if (item.unit && ingredient.unit && item.unit.toLowerCase() !== ingredient.unit.toLowerCase()) {
                    finalQty = denormalizeQty(item.qty, item.unit, ingredient.unit);
                    if (item.gramasi) finalGramasi = denormalizeQty(item.gramasi, item.unit, ingredient.unit);
                    if (item.qtyBesar) finalQtyBesar = denormalizeQty(item.qtyBesar, item.unit, ingredient.unit);
                    if (item.qtyKecil) finalQtyKecil = denormalizeQty(item.qtyKecil, item.unit, ingredient.unit);
                    if (item.qtyBumil) finalQtyBumil = denormalizeQty(item.qtyBumil, item.unit, ingredient.unit);
                    if (item.qtyBalita) finalQtyBalita = denormalizeQty(item.qtyBalita, item.unit, ingredient.unit);
                }

                await MenuIngredient.create({
                    menuId: id,
                    ingredientId: ingredient.id,
                    qtyNeeded: finalQty,
                    gramasi: finalGramasi,
                    qtyBesar: finalQtyBesar,
                    qtyKecil: finalQtyKecil,
                    qtyBumil: finalQtyBumil,
                    qtyBalita: finalQtyBalita,
                    isSecukupnya: item.isSecukupnya || false
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
                    through: { attributes: ['qtyNeeded', 'isSecukupnya'] }
                }
            ]
        });

        // Aggregate ingredients separated by menu type
        const aggregated: Record<string, { id: string; name: string; unit: string; qty: number; menuType?: string; currentStock?: number; isSecukupnya?: boolean }> = {};

        menus.forEach((menu: any) => {
            menu.ingredients.forEach((ing: any) => {
                const key = `${ing.id}-${menu.menuType}`;

                if (aggregated[key]) {
                    aggregated[key].qty += (ing.MenuIngredient?.qtyNeeded || 0);
                } else {
                    aggregated[key] = {
                        id: ing.id,
                        name: ing.name,
                        unit: ing.unit,
                        qty: ing.MenuIngredient?.qtyNeeded || 0,
                        isSecukupnya: ing.MenuIngredient?.isSecukupnya || false,
                        currentStock: ing.currentStock || 0,
                        menuType: menu.menuType
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

export async function evaluateMenuIngredients(menuId: string, evaluations: { ingredientId?: string; miId?: string; evaluationStatus: 'PAS' | 'KURANG' | 'BERLEBIH'; evaluationNote?: string }[]) {
    const session = await getSession();
    if (!session || !['AHLI_GIZI', 'SUPER_ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const menu = await Menu.findByPk(menuId);
        if (!menu) return { error: 'Menu not found' };

        // Process evaluations for each ingredient
        for (const evalData of evaluations) {
            let menuIngredient = null;
            if (evalData.miId) {
                menuIngredient = await MenuIngredient.findByPk(evalData.miId);
            } else if (evalData.ingredientId) {
                menuIngredient = await MenuIngredient.findOne({
                    where: {
                        menuId: menuId,
                        ingredientId: evalData.ingredientId
                    }
                });
            }

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
                through: { attributes: ['id', 'qtyNeeded', 'gramasi', 'qtyBesar', 'qtyKecil', 'qtyBumil', 'qtyBalita', 'evaluationStatus', 'evaluationNote'] }
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
                countKecil: historyMenu.get('countKecil'),
                countBesar: historyMenu.get('countBesar'),
                countBumil: historyMenu.get('countBumil'),
                countBalita: historyMenu.get('countBalita'),
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
