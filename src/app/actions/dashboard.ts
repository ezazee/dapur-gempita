'use server';

import { Ingredient, Purchase, Production, Receipt, StockMovement, Menu } from '@/models';
import { Op } from 'sequelize';

export async function getDashboardData() {
    try {
        // 1. Stats
        const totalIngredients = await Ingredient.count();

        const pendingPurchases = await Purchase.count({
            where: { status: 'waiting' } // or 'draft' depending on business logic
        });

        // Today's Date Range
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todayReceipts = await Receipt.count({
            where: {
                receivedAt: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        });

        const todayProductions = await Production.sum('totalPortions', {
            where: {
                productionDate: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        }) || 0; // sum returns number or null

        // 2. Low Stock Items (Top 5)
        // Sequelize doesn't have a direct "where column < other_column" in simple notation easily without literal,
        // but we can fetch and filter or use literal. For simplicity here, we'll fetch all and filter or use literal if critical.
        // Let's use sequelize.literal for efficiency if needed, or just fetch where currentStock <= minimumStock.
        // For now, let's fetch items where curr < min is not trivial in standard find options without Op.col or literal.
        // We will fetch all that have low stock roughly or just top 5 by (current - min) ASC ??
        // Let's just getAll and filter for simplicity in migration phase or use literal.

        const lowStockItems = await Ingredient.findAll({
            where: sequelize.literal('current_stock <= minimum_stock'),
            limit: 5,
            raw: true
        });


        // 3. Recent Movements
        const recentMovements = await StockMovement.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']],
            include: [{
                model: Ingredient,
                as: 'ingredient',
                attributes: ['name']
            }],
            raw: true,
            nest: true // Needed for include to nest properly in raw result
        });

        const mappedMovements = recentMovements.map((m: any) => ({
            ...m,
            ingredientName: m.ingredient.name,
            createdAt: m.createdAt.toISOString()
        }));


        // 4. Today's Menu
        const todayMenus = await Menu.findAll({
            where: {
                menuDate: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            },
            raw: true
        });


        return {
            stats: {
                totalIngredients,
                pendingPurchases,
                todayReceipts,
                todayProductions,
            },
            lowStockItems: lowStockItems.map((i: any) => ({
                id: i.id,
                name: i.name,
                currentStock: i.currentStock,
                minimumStock: i.minimumStock,
                unit: i.unit
            })),
            recentMovements: mappedMovements,
            todayMenus: todayMenus.map((m: any) => ({
                ...m,
                menuDate: m.menuDate.toISOString()
            })),
        };

    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Return empty fallback
        return {
            stats: { totalIngredients: 0, pendingPurchases: 0, todayReceipts: 0, todayProductions: 0 },
            lowStockItems: [],
            recentMovements: [],
            todayMenus: []
        };
    }
}

import { sequelize } from '@/lib/sequelize';
