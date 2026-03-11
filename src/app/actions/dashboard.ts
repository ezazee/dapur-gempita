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

        // 2. Pending Evaluations (Production exists but evaluatorId is null)
        const pendingEvaluations = await Menu.count({
            include: [{
                model: Production,
                as: 'productions',
                required: true, // Only if production exists
            }],
            where: {
                evaluatorId: { [Op.eq]: null as any }
            },
            distinct: true // Count unique menus
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


        const todayMenus = await Menu.findAll({
            where: {
                menuDate: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            }
        });

        // Get Today's Productions to check for completion
        const todayProductionsList = await Production.findAll({
            where: {
                productionDate: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            },
            attributes: ['id', 'menuId']
        });
        const completedMenuIds = new Set(todayProductionsList.map(p => p.menuId));

        // 3. Consolidated Recent Activities (High Level)
        const recentProductions = await Production.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: Menu, as: 'menu', attributes: ['name', 'menuType'] }]
        });

        const recentReceipts = await Receipt.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            // No specific description field in Receipt usually, 
            // but we can show it's a receipt of something if needed.
        });

        const activitiesLine = [
            ...recentProductions.map((p: any) => ({
                id: `prod-${p.id}`,
                type: 'production',
                title: 'Produksi Selesai',
                description: `Penyelesaian menu: ${p.menu?.name || 'Unknown'}`,
                time: p.createdAt.toISOString(),
                status: 'completed',
                menuType: p.menu?.menuType
            })),
            ...recentReceipts.map((r: any) => ({
                id: `rec-${r.id}`,
                type: 'receipt',
                title: 'Penerimaan Barang',
                description: `Penerimaan stok barang baru dilakukan`,
                time: r.createdAt.toISOString(),
                status: 'completed'
            }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);


        return {
            stats: {
                totalIngredients,
                pendingPurchases,
                todayReceipts,
                todayProductions,
                pendingEvaluations,
            },
            lowStockItems: lowStockItems.map((i: any) => ({
                id: i.id,
                name: i.name,
                currentStock: i.currentStock,
                minimumStock: i.minimumStock,
                unit: i.unit
            })),
            recentActivities: activitiesLine,
            todayMenus: todayMenus.map((m: any) => ({
                id: m.id,
                name: m.name,
                menuType: m.menuType,
                countKecil: m.countKecil || 0,
                countBesar: m.countBesar || 0,
                countBumil: m.countBumil || 0,
                countBalita: m.countBalita || 0,
                isCompleted: completedMenuIds.has(m.id),
                productionId: todayProductionsList.find((p: any) => p.menuId === m.id)?.id,
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
