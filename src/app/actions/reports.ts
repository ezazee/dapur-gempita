'use server';

import {
    Purchase, PurchaseItem, Receipt, ReceiptItem,
    Production, ProductionItem, Ingredient, Menu, User
} from '@/models';
import { getSession } from './auth';
import { Op } from 'sequelize';

export async function getDailyReport(date: string) {
    const session = await getSession();
    if (!session || !['KEPALA_DAPUR', 'SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
        return { error: 'Permission denied' };
    }

    try {
        // Parse date in local timezone
        const [year, month, day] = date.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        const nextDate = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

        // Table 1: Fetch Menus for the day (Ahli Gizi)
        const menus = await Menu.findAll({
            include: [
                {
                    model: Ingredient,
                    as: 'ingredients',
                    through: { attributes: ['qtyNeeded'] }
                }
            ]
        });

        // Table 2: Fetch Purchases (Keuangan)
        const purchases = await Purchase.findAll({
            where: {
                purchaseDate: {
                    [Op.gte]: targetDate,
                    [Op.lt]: nextDate
                }
            },
            include: [
                { model: User, as: 'creator', attributes: ['name'] },
                {
                    model: PurchaseItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }]
                }
            ]
        });

        // Table 3: Fetch Receipts (Aslap)
        const receipts = await Receipt.findAll({
            where: {
                receivedAt: {
                    [Op.gte]: targetDate,
                    [Op.lt]: nextDate
                },
                status: 'accepted'
            },
            include: [
                { model: User, as: 'receiver', attributes: ['name'] },
                {
                    model: ReceiptItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }]
                }
            ]
        });

        // Table 4: Fetch Productions (Chef)
        const productions = await Production.findAll({
            where: {
                productionDate: {
                    [Op.gte]: targetDate,
                    [Op.lt]: nextDate
                }
            },
            include: [
                { model: Menu, as: 'menu', attributes: ['name'] },
                { model: User, as: 'chef', attributes: ['name'] },
                {
                    model: ProductionItem,
                    as: 'items',
                    include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }]
                }
            ]
        });

        // Format: Table 1 - Ahli Gizi (Menu + Ingredients)
        const menuData = menus.map((m: any) => ({
            menuName: m.name,
            ingredients: (m.ingredients || []).map((ing: any) => ({
                name: ing.name,
                unit: ing.unit,
                qtyNeeded: ing.MenuIngredient?.qtyNeeded || 0
            }))
        }));

        // Format: Table 2 - Keuangan (Purchase Items with memo & photos)
        const purchaseData = purchases.map((p: any) => ({
            purchaseId: p.id.substring(0, 8),
            keuangan: p.creator?.name || 'Unknown',
            status: p.status,
            items: (p.items || []).map((i: any) => ({
                name: i.ingredient?.name || 'Unknown',
                qty: i.estimatedQty,
                unit: i.ingredient?.unit || 'kg',
                memo: i.memo || null,
                photoUrl: i.photoUrl || null
            }))
        }));

        // Format: Table 3 - Aslap (Receipt Items with weights & photos)
        const receiptData = receipts.map((r: any) => ({
            receiptId: r.id.substring(0, 8),
            receiver: r.receiver?.name || 'Unknown',
            items: (r.items || []).map((i: any) => ({
                name: i.ingredient?.name || 'Unknown',
                grossWeight: i.grossWeight,
                netWeight: i.netWeight,
                unit: i.ingredient?.unit || 'kg',
                photoUrl: i.photoUrl || null
            }))
        }));

        // Format: Table 4 - Chef (Productions with portions & ingredients & photos)
        const productionData = productions.map((p: any) => ({
            menuName: p.menu?.name || 'Unknown',
            chef: p.chef?.name || 'Unknown',
            portions: p.totalPortions,
            photoUrl: p.photoUrl || null,
            ingredients: (p.items || []).map((i: any) => ({
                name: i.ingredient?.name || 'Unknown',
                qtyUsed: i.qtyUsed,
                unit: i.ingredient?.unit || 'kg'
            }))
        }));

        return {
            success: true,
            data: {
                date: targetDate.toISOString(),
                ahliGizi: menuData,
                keuangan: purchaseData,
                aslap: receiptData,
                chef: productionData,
                summary: {
                    totalMenus: menus.length,
                    totalPurchases: purchases.length,
                    totalReceipts: receipts.length,
                    totalProductions: productions.length,
                    totalPortions: productions.reduce((sum: number, p: any) => sum + (p.totalPortions || 0), 0)
                }
            }
        };
    } catch (error: any) {
        console.error('[getDailyReport] Error:', error);
        return { error: error.message || 'Failed to generate report' };
    }
}
