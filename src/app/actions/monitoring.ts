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
        const { Purchase, PurchaseItem } = await import('@/models');

        // 1. Get Today's Range in Jakarta Time (UTC+7)
        const now = new Date();
        const today = now;
        const jakartaOffset = 7 * 60; // 7 hours in minutes
        const localOffset = now.getTimezoneOffset(); // in minutes (negative for UTC+7)

        const start = new Date(now);
        start.setMinutes(now.getMinutes() + localOffset + jakartaOffset);
        start.setHours(0, 0, 0, 0);
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
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit', 'category', 'currentStock'] }]
                }
            ]
        });

        // 3. Get Pending/Approved Purchases (Potential Stock)
        // We look for approved purchases that might support today's menus
        const pendingPurchases = await Purchase.findAll({
            where: {
                status: 'approved'
            },
            include: [
                {
                    model: PurchaseItem,
                    as: 'items'
                }
            ]
        });

        // 4. Map Ingredients from Menus to Status
        const ingredientMap: Record<string, {
            id: string;
            name: string;
            unit: string;
            neededQty: number;
            receivedGrossToday: number;
            receivedNetToday: number;
            currentStock: number;
            purchasedQty: number;
            status: 'PENDING' | 'RECEIVED' | 'PARTIAL' | 'STOCK_READY' | 'ON_PURCHASE';
            receiptCountToday: number;
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
                        receivedGrossToday: 0,
                        receivedNetToday: 0,
                        currentStock: ing.currentStock || 0,
                        purchasedQty: 0,
                        status: 'PENDING',
                        receiptCountToday: 0,
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

        // Add today's receipt data
        receipts.forEach((receipt: any) => {
            receipt.items?.forEach((item: any) => {
                const ingId = item.ingredientId;
                if (!ingredientMap[ingId]) {
                    const ingCat = item.ingredient?.category || 'MASAK';
                    ingredientMap[ingId] = {
                        id: ingId,
                        name: item.ingredient?.name || 'Unknown',
                        unit: item.ingredient?.unit || 'kg',
                        category: ingCat,
                        neededQty: 0,
                        receivedGrossToday: 0,
                        receivedNetToday: 0,
                        currentStock: item.ingredient?.currentStock || 0,
                        purchasedQty: 0,
                        status: 'PENDING',
                        receiptCountToday: 0,
                        types: new Set<string>(),
                        isUnscheduled: true
                    };
                    const mappedType = ingCat === 'KERING' ? 'Snack/Kering' : 'Masakan/Ompreng';
                    ingredientMap[ingId].types.add(mappedType);
                }
                ingredientMap[ingId].receivedGrossToday += parseFloat(item.grossWeight || 0);
                ingredientMap[ingId].receivedNetToday += parseFloat(item.netWeight || 0);
                ingredientMap[ingId].receiptCountToday += 1;
            });
        });

        // Add pending purchase data
        pendingPurchases.forEach((purchase: any) => {
            purchase.items?.forEach((item: any) => {
                const ingId = item.ingredientId;
                if (ingredientMap[ingId]) {
                    ingredientMap[ingId].purchasedQty += parseFloat(item.qty || 0);
                }
            });
        });

        // Finalize status for each ingredient
        const results = Object.values(ingredientMap).map(item => {
            const needed = item.neededQty;
            const receivedToday = item.receivedNetToday;
            const stock = item.currentStock;
            const purchased = item.purchasedQty;

            if (needed > 0) {
                if (stock >= needed) {
                    item.status = 'STOCK_READY';
                } else if (receivedToday >= needed * 0.95) {
                    item.status = 'RECEIVED';
                } else if (receivedToday > 0) {
                    item.status = 'PARTIAL';
                } else if (purchased >= needed) {
                    item.status = 'ON_PURCHASE';
                } else {
                    item.status = 'PENDING';
                }
            } else {
                // Unscheduled receipt
                item.status = 'RECEIVED';
            }

            return {
                ...item,
                types: Array.from(item.types)
            };
        });

        // 5. Calculate Readiness PER MENU
        const todayProductions = await Production.findAll({
            where: {
                productionDate: {
                    [Op.between]: [dbStart, dbEnd]
                }
            }
        });
        const completedMenuIds = new Set(todayProductions.map(p => p.menuId));

        const menuReadiness = menus.map((menu: any) => {
            let totalIngredients = 0;
            let readyIngredients = 0;
            let purchasedIngredients = 0;

            menu.ingredients?.forEach((ing: any) => {
                totalIngredients++;
                const stats = ingredientMap[ing.id];
                if (stats) {
                    // Ingredient is ready if:
                    // 1. Physically in stock enough to cover this menu
                    // 2. Or received today specifically for this
                    const isReady = stats.currentStock >= (ing.MenuIngredient?.qtyNeeded || 0) || 
                                    stats.receivedNetToday >= (ing.MenuIngredient?.qtyNeeded || 0) * 0.95;
                    
                    if (isReady) {
                        readyIngredients++;
                    } else if (stats.purchasedQty >= (ing.MenuIngredient?.qtyNeeded || 0)) {
                        purchasedIngredients++;
                    }
                }
            });

            return {
                id: menu.id,
                name: menu.name,
                menuType: menu.menuType || 'OMPRENG',
                totalIngredients,
                readyIngredients,
                purchasedIngredients,
                // Flexible Readiness: Ready if physically in stock OR received today
                isReady: totalIngredients > 0 && readyIngredients === totalIngredients,
                // Status for UI: 'READY' | 'PURCHASED' | 'PENDING'
                overallStatus: (readyIngredients === totalIngredients) ? 'READY' : 
                               ((readyIngredients + purchasedIngredients) === totalIngredients ? 'PURCHASED' : 'PENDING'),
                isCompleted: completedMenuIds.has(menu.id),
                progress: totalIngredients > 0 ? (readyIngredients / totalIngredients) * 100 : 0,
                purchaseProgress: totalIngredients > 0 ? ((readyIngredients + purchasedIngredients) / totalIngredients) * 100 : 0,
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
