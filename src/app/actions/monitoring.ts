'use server';

import {
    Menu,
    Ingredient,
    MenuIngredient,
    Receipt,
    ReceiptItem,
    Production
} from '@/models';
import { Op } from 'sequelize';
import { getSession } from './auth';

export async function getDailyMonitoring() {
    const session = await getSession();
    if (!session) {
        throw new Error('Unauthorized');
    }
    try {
        // 1. Get Today's Range in Jakarta Time (UTC+7)
        // Adjust for local server time being UTC if necessary
        const now = new Date();
        const today = now;
        const jakartaOffset = 7 * 60; // 7 hours in minutes
        const localOffset = now.getTimezoneOffset(); // in minutes (negative for UTC+7)

        // Target: Today at 00:00:00 and 23:59:59 in Jakarta
        const start = new Date(now);
        start.setMinutes(now.getMinutes() + localOffset + jakartaOffset);
        start.setHours(0, 0, 0, 0);
        // Convert back to UTC for DB query if DB is UTC
        const dbStart = new Date(start.getTime() - (jakartaOffset + localOffset) * 60000);

        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        const dbEnd = new Date(end.getTime() - (jakartaOffset + localOffset) * 60000);

        // 1. Get Today's Menus
        const menus = await Menu.findAll({
            where: {
                menuDate: {
                    [Op.between]: [dbStart, dbEnd]
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

        // 2. Get Today's Receipts
        const receipts = await Receipt.findAll({
            where: {
                receivedAt: {
                    [Op.between]: [dbStart, dbEnd]
                }
            },
            include: [
                {
                    model: ReceiptItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit', 'category'] }]
                }
            ]
        });

        // 3. Map Ingredients from Menus to Receipt Weights
        const ingredientMap: Record<string, {
            id: string;
            name: string;
            unit: string;
            neededQty: number;
            receivedGross: number;
            receivedNet: number;
            status: 'PENDING' | 'RECEIVED' | 'PARTIAL';
            receiptCount: number;
            types: Set<string>;
            isUnscheduled?: boolean;
            category?: string;
        }> = {};

        menus.forEach((menu: any) => {
            menu.ingredients?.forEach((ing: any) => {
                if (!ingredientMap[ing.id]) {
                    ingredientMap[ing.id] = {
                        id: ing.id,
                        name: ing.name,
                        unit: ing.unit,
                        category: ing.category,
                        neededQty: 0,
                        receivedGross: 0,
                        receivedNet: 0,
                        status: 'PENDING',
                        receiptCount: 0,
                        types: new Set<string>(),
                        isUnscheduled: false
                    };
                }
                ingredientMap[ing.id].neededQty += (ing.MenuIngredient?.qtyNeeded || 0);
                if (menu.menuType) {
                    const mappedType = menu.menuType === 'OMPRENG' ? 'Masakan/Ompreng' : 'Snack/Kering';
                    ingredientMap[ing.id].types.add(mappedType);
                }
            });
        });

        // Add received data
        receipts.forEach((receipt: any) => {
            receipt.items?.forEach((item: any) => {
                const ingId = item.ingredientId;
                if (!ingredientMap[ingId]) {
                    // Ingredient in receipt but not in today's menu (extra purchase)
                    const ingCat = item.ingredient?.category || 'MASAK';
                    ingredientMap[ingId] = {
                        id: ingId,
                        name: item.ingredient?.name || 'Unknown',
                        unit: item.ingredient?.unit || 'kg',
                        category: ingCat,
                        neededQty: 0,
                        receivedGross: 0,
                        receivedNet: 0,
                        status: 'PENDING',
                        receiptCount: 0,
                        types: new Set<string>(),
                        isUnscheduled: true
                    };

                    // Properly categorize extra ingredients
                    const mappedType = ingCat === 'KERING' ? 'Snack/Kering' : 'Masakan/Ompreng';
                    ingredientMap[ingId].types.add(mappedType);
                }
                ingredientMap[ingId].receivedGross += parseFloat(item.grossWeight || 0);
                ingredientMap[ingId].receivedNet += parseFloat(item.netWeight || 0);
                ingredientMap[ingId].receiptCount += 1;
            });
        });

        // Finalize status
        const results = Object.values(ingredientMap).map(item => {
            const rNet = item.receivedNet;
            if (item.receiptCount > 0) {
                if (item.neededQty > 0 && rNet > 0 && rNet < item.neededQty * 0.95) {
                    item.status = 'PARTIAL';
                } else {
                    item.status = 'RECEIVED';
                }
            } else {
                item.status = 'PENDING';
            }
            return {
                ...item,
                types: Array.from(item.types)
            };
        });

        // 4. Get Today's Productions
        const todayProductions = await Production.findAll({
            where: {
                productionDate: {
                    [Op.between]: [dbStart, dbEnd]
                }
            }
        });

        const completedMenuIds = new Set(todayProductions.map(p => p.menuId));

        // 5. Calculate Readiness PER MENU
        const menuReadiness = menus.map((menu: any) => {
            let totalIngredients = 0;
            let readyIngredients = 0;

            menu.ingredients?.forEach((ing: any) => {
                totalIngredients++;
                const stats = ingredientMap[ing.id];
                if (stats && (stats.receiptCount > 0 || stats.receivedNet >= (ing.MenuIngredient?.qtyNeeded || 0) * 0.95)) {
                    readyIngredients++;
                }
            });

            return {
                id: menu.id,
                name: menu.name,
                menuType: menu.menuType || 'OMPRENG',
                totalIngredients,
                readyIngredients,
                isReady: totalIngredients > 0 && readyIngredients === totalIngredients,
                isCompleted: completedMenuIds.has(menu.id),
                progress: totalIngredients > 0 ? (readyIngredients / totalIngredients) * 100 : 0,
                countKecil: menu.countKecil || 0,
                countBesar: menu.countBesar || 0,
                countBumil: menu.countBumil || 0,
                countBalita: menu.countBalita || 0,
                date: menu.menuDate.toISOString()
            };
        });

        return {
            success: true,
            date: today.toISOString(),
            menus: menuReadiness,
            data: menus.length === 0 ? [] : results
        };

    } catch (error: any) {
        console.error('Error fetching monitoring data:', error);
        return { success: false, error: error.message || 'Failed to fetch monitoring data' };
    }
}

export async function getStockMovements(params: {
    page: number;
    pageSize: number;
    startDate?: string;
    endDate?: string;
}) {
    const { page, pageSize, startDate, endDate } = params;
    const offset = (page - 1) * pageSize;

    const { StockMovement, Ingredient, User } = await import('@/models');
    const { Op } = await import('sequelize');

    const where: any = {};
    if (startDate && endDate) {
        where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    } else if (startDate) {
        where.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
        where.createdAt = { [Op.lte]: new Date(endDate) };
    }

    try {
        const { rows, count } = await StockMovement.findAndCountAll({
            where,
            include: [
                { model: Ingredient, as: 'ingredient', attributes: ['name', 'unit', 'category'] },
                { model: User, as: 'creator', attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset: offset,
        });

        return {
            data: rows.map((m: any) => ({
                id: m.id,
                date: m.createdAt.toISOString(),
                ingredientName: m.ingredient?.name || 'Unknown',
                ingredientCategory: m.ingredient?.category || 'MASAK',
                unit: m.ingredient?.unit || 'kg',
                type: m.type,
                qty: m.qty,
                balanceBefore: m.balanceBefore,
                balanceAfter: m.balanceAfter,
                creatorName: m.creator?.name || 'System',
                note: m.note
            })),
            total: count
        };
    } catch (error) {
        console.error('Error fetching stock movements:', error);
        return { data: [], total: 0 };
    }
}
