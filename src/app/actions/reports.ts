'use server';

import {
    Purchase, PurchaseItem, Receipt, ReceiptItem,
    Production, ProductionItem, Ingredient, Menu, User, sequelize
} from '@/models';
import { getSession } from './auth';
import { Op } from 'sequelize';

export async function getReportData(filters: {
    startDate: string;
    endDate?: string;
    type: 'combined' | 'purchase' | 'inventory' | 'evaluation' | 'menu';
}) {
    const session = await getSession();
    if (!session || !['KEPALA_DAPUR', 'SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        const end = filters.endDate ? new Date(filters.endDate) : new Date(start);
        end.setHours(23, 59, 59, 999);

        const results: any = {
            dateRange: { start: start.toISOString(), end: end.toISOString() }
        };

        // 1. Inventory Report (Gudang) - Current status + Movements
        if (filters.type === 'inventory' || filters.type === 'combined') {
            const ingredients = await Ingredient.findAll({
                order: [['name', 'ASC']]
            });
            results.inventory = ingredients.map((i: any) => ({
                id: i.id,
                name: i.name,
                unit: i.unit,
                currentStock: i.currentStock,
                minimumStock: i.minimumStock,
                category: i.category,
                status: i.currentStock <= i.minimumStock ? 'low' : 'ok'
            }));
        }

        // 2. Purchase Report (Pembelian)
        if (filters.type === 'purchase' || filters.type === 'combined') {
            const purchases = await Purchase.findAll({
                where: {
                    purchaseDate: { [Op.between]: [start, end] }
                },
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

            results.purchases = purchases.map((p: any) => ({
                id: p.id,
                date: p.purchaseDate,
                creator: p.creator?.name || 'System',
                status: p.status,
                items: (p.items || []).map((i: any) => ({
                    name: i.ingredient?.name || 'Unknown',
                    qty: i.estimatedQty,
                    unit: i.ingredient?.unit || 'kg',
                    category: i.ingredient?.category || 'MASAK',
                    memo: i.memo?.replace(/^\[REQ:[^\]]+\]\s*/i, '') || '',
                    photoUrl: i.photoUrl
                }))
            }));
        }

        // 3. Menu & Recipe Report
        if (filters.type === 'menu' || filters.type === 'combined') {
            const menus = await Menu.findAll({
                where: {
                    menuDate: { [Op.between]: [start, end] }
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

            results.menus = menus.map((m: any) => ({
                id: m.id,
                name: m.name,
                date: m.menuDate,
                type: m.menuType,
                ingredients: (m.ingredients || []).map((ing: any) => ({
                    name: ing.name,
                    unit: ing.unit,
                    category: ing.category,
                    qtyNeeded: ing.MenuIngredient?.qtyNeeded || 0
                }))
            }));
        }

        // 4. Production / Evaluation Report (Nutritionist View)
        if (filters.type === 'evaluation' || filters.type === 'combined') {
            const menus = await Menu.findAll({
                where: {
                    menuDate: { [Op.between]: [start, end] }
                },
                include: [
                    {
                        model: Ingredient,
                        as: 'ingredients',
                        through: { attributes: ['evaluationStatus', 'evaluationNote'] }
                    },
                    { model: User, as: 'creator', attributes: ['name'] }
                ],
                order: [['menuDate', 'DESC']]
            });

            const evaluations = await Promise.all(menus.map(async (m: any) => {
                const ingredients = m.ingredients || [];
                const evaluatedIngs = ingredients.filter((i: any) => !!i.MenuIngredient?.evaluationStatus);
                const pas = evaluatedIngs.filter((i: any) => i.MenuIngredient.evaluationStatus === 'PAS').length;
                const total = ingredients.length;
                const accuracy = total > 0 ? Math.round((pas / total) * 100) : 0;
                const status = m.evaluatorId ? 'TEREVALUASI' : 'BELUM';

                // Find matching production to get photoUrl
                const production = await Production.findOne({
                    where: { menuId: m.id }
                });

                return {
                    id: m.id,
                    menuName: m.name,
                    menuType: m.menuType || 'OMPRENG',
                    date: m.menuDate,
                    portions: (m.countBesar || 0) + (m.countKecil || 0) + (m.countBumil || 0) + (m.countBalita || 0),
                    accuracy,
                    pas,
                    bermasalah: total - pas,
                    totalIngredients: total,
                    status,
                    photoUrl: production?.photoUrl,
                    note: m.description // Use menu description or a combined note if needed
                };
            }));

            results.evaluations = evaluations;

            // 4b. Frequent Menus Analysis
            const freq = await Menu.findAll({
                attributes: [
                    'name',
                    [sequelize.fn('COUNT', sequelize.col('name')), 'count'],
                    'menuType'
                ],
                where: {
                    menuDate: { [Op.between]: [start, end] }
                },
                group: ['name', 'menuType'],
                order: [[sequelize.literal('count'), 'DESC']],
                limit: 10
            });
            results.frequentMenus = freq.map((m: any) => ({
                name: m.name,
                count: parseInt(m.get('count') as string),
                type: m.menuType || 'OMPRENG'
            }));
        }

        // 5. Combined Summary
        if (filters.type === 'combined') {
            results.summary = {
                totalPurchases: results.purchases?.length || 0,
                totalMenus: results.menus?.length || 0,
                totalProductions: results.evaluations?.length || 0,
                totalPortions: results.evaluations?.reduce((sum: number, p: any) => sum + (p.portions || 0), 0) || 0,
                lowStockCount: results.inventory?.filter((i: any) => i.status === 'low').length || 0
            };
        }

        return { success: true, data: results };
    } catch (error: any) {
        console.error('[getReportData] Error:', error);
        return { error: error.message || 'Failed to generate report' };
    }
}
