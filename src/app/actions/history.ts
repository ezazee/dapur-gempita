'use server';

import {
    Menu, Purchase, Receipt, Production,
    User, Ingredient, PurchaseItem, ReceiptItem, ProductionItem
} from '@/models';
import { getSession } from './auth';
import { Op } from 'sequelize';

export type HistoryType = 'planning' | 'purchase' | 'receipt' | 'production';

export interface HistoryEvent {
    id: string;
    type: HistoryType;
    title: string;
    description: string;
    timestamp: string;
    user: string;
    data: any;
    status?: string;
}

export async function getUnifiedHistory(filters: {
    startDate?: string;
    endDate?: string;
    type?: HistoryType[];
}) {
    const session = await getSession();
    if (!session || !['SUPER_ADMIN', 'KEPALA_DAPUR'].includes(session.role)) {
        throw new Error('Unauthorized');
    }

    const start = filters.startDate ? new Date(filters.startDate) : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = filters.endDate ? new Date(filters.endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const types = filters.type || ['planning', 'purchase', 'receipt', 'production'];
    const events: HistoryEvent[] = [];

    // 1. Planning (Menus)
    if (types.includes('planning')) {
        try {
            const menus = await Menu.findAll({
                where: { createdAt: { [Op.between]: [start, end] } },
                include: [{ model: Ingredient, as: 'ingredients', through: { attributes: ['qtyNeeded'] } }],
                order: [['createdAt', 'DESC']],
                limit: 50
            });
            menus.forEach(m => {
                const plain = m.toJSON();
                const menuTypeLabel = plain.menuType === 'KERING' ? 'Snack/Kering' : 'Masakan/Ompreng';
                const icon = plain.menuType === 'KERING' ? '🍪' : '🥘';
                events.push({
                    id: `menu-${m.id}`,
                    type: 'planning',
                    title: `${icon} Perencanaan ${menuTypeLabel}`,
                    description: `Menu baru dibuat: ${m.name}`,
                    timestamp: m.createdAt.toISOString(),
                    user: 'Ahli Gizi',
                    data: { ...plain, date: plain.menuDate } // Normalize for dialog
                });
            });
        } catch (err) {
            console.error('[HistoryAction] Planning fetch error:', err);
        }
    }

    // Pre-declare vars
    let purchases: any[] = [];
    let receipts: any[] = [];

    // 2. Fetch Purchases (Financial)
    if (types.includes('purchase')) {
        try {
            purchases = await Purchase.findAll({
                where: { createdAt: { [Op.between]: [start, end] } },
                include: [
                    { model: User, as: 'creator', attributes: ['name'] },
                    { model: PurchaseItem, as: 'items', include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }] }
                ],
                order: [['createdAt', 'DESC']],
                limit: 50
            });
        } catch (err) {
            console.error('[HistoryAction] Purchase fetch error:', err);
        }
    }

    // 3. Fetch Receipts (Aslap)
    if (types.includes('receipt')) {
        try {
            receipts = await Receipt.findAll({
                where: { createdAt: { [Op.between]: [start, end] } },
                include: [
                    { model: User, as: 'receiver', attributes: ['name'] },
                    { model: Purchase, as: 'purchase', attributes: ['purchaseType', 'purchaseDate'] },
                    { model: ReceiptItem, as: 'items', include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }] }
                ],
                order: [['createdAt', 'DESC']],
                limit: 50
            });
        } catch (err) {
            console.error('[HistoryAction] Receipt fetch error:', err);
        }
    }

    // 3.5 Pre-fetch Menus for classification
    const typeMap: Record<string, Record<string, Set<string>>> = {};
    if (purchases.length > 0 || receipts.length > 0) {
        try {
            const dateConditions = [...new Set([
                ...purchases.map((p: any) => p.purchaseDate),
                ...receipts.map((r: any) => r.purchase?.purchaseDate)
            ].filter(Boolean))].map((d: any) => {
                const date = new Date(d);
                return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            });

            const uniqueDateStrs = [...new Set(dateConditions)];

            const conditions = uniqueDateStrs.map(dateStr => {
                const [y, m, d] = dateStr.split('-');
                const year = parseInt(y, 10);
                const month = parseInt(m, 10);
                const day = parseInt(d, 10);
                const s = new Date(year, month, day, 0, 0, 0, 0);
                const e = new Date(year, month, day, 23, 59, 59, 999);
                return { menuDate: { [Op.between]: [s, e] } };
            });

            if (conditions.length > 0) {
                const menusForMapping = await Menu.findAll({
                    where: { [Op.or]: conditions } as any,
                    include: [{ model: Ingredient, as: 'ingredients', through: { attributes: [] } }]
                });

                menusForMapping.forEach((m: any) => {
                    const d = new Date(m.menuDate);
                    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                    if (!typeMap[dateKey]) typeMap[dateKey] = {};

                    m.ingredients.forEach((ing: any) => {
                        if (!typeMap[dateKey][ing.id]) typeMap[dateKey][ing.id] = new Set();
                        typeMap[dateKey][ing.id].add(m.menuType || 'OMPRENG');
                    });
                });
            }
        } catch (err) {
            console.error('[HistoryAction] Menu pre-fetch error:', err);
        }
    }

    // Process Purchases to add Types
    purchases.forEach(p => {
        const plain = p.toJSON();
        const pDate = new Date(plain.purchaseDate);
        const dateKey = `${pDate.getFullYear()}-${pDate.getMonth()}-${pDate.getDate()}`;

        let hasKering = false;
        let hasMasak = false;

        const items = ((plain as any).items || []).map((item: any) => {
            let menuType = 'OMPRENG';
            if (plain.purchaseType === 'OPERATIONAL') {
                menuType = 'OPERATIONAL';
            } else {
                const types = typeMap[dateKey]?.[item.ingredientId] ? Array.from(typeMap[dateKey][item.ingredientId]) : [];
                menuType = types.includes('KERING') ? 'KERING' : 'OMPRENG';
                if (menuType === 'KERING') hasKering = true;
                if (menuType === 'OMPRENG') hasMasak = true;
            }
            return {
                ...item,
                unit: item.ingredient?.unit,
                ingredientName: item.ingredient?.name,
                memo: item.memo?.replace(/^\[REQ:[^\]]+\]\s*/i, ''),
                menuType
            };
        });

        const isOp = plain.purchaseType === 'OPERATIONAL';
        let title = 'Pesanan Barang';
        if (isOp) {
            title = '🛍️ Pesanan Barang Operasional';
        } else {
            if (hasKering && hasMasak) title = '🛒 Pesanan Masakan & Snack';
            else if (hasKering) title = '🍪 Pesanan Barang Snack';
            else title = '🥘 Pesanan Barang Masakan';
        }

        events.push({
            id: `purchase-${p.id}`,
            type: 'purchase',
            title,
            description: isOp ? `Pemesanan barang dilakukan. Status: ${p.status}` : `Pemesanan barang dilakukan. Status: ${p.status}`,
            timestamp: p.createdAt.toISOString(),
            user: (plain as any).creator?.name || 'Keuangan',
            status: p.status,
            data: { ...plain, items, date: plain.purchaseDate, creatorName: (plain as any).creator?.name, purchaseType: plain.purchaseType }
        });
    });

    // Process Receipts to add Types
    receipts.forEach(r => {
        const plain = r.toJSON();
        let dateKey = '';
        if (plain.purchase?.purchaseDate) {
            const pDate = new Date(plain.purchase.purchaseDate);
            dateKey = `${pDate.getFullYear()}-${pDate.getMonth()}-${pDate.getDate()}`;
        }

        const purchaseType = plain.purchase?.purchaseType || 'FOOD';
        const isOp = purchaseType === 'OPERATIONAL';

        let hasKering = false;
        let hasMasak = false;

        const items = ((plain as any).items || []).map((item: any) => {
            let menuType = 'OMPRENG';
            if (isOp) {
                menuType = 'OPERATIONAL';
            } else if (dateKey) {
                const types = typeMap[dateKey]?.[item.ingredientId] ? Array.from(typeMap[dateKey][item.ingredientId]) : [];
                menuType = types.includes('KERING') ? 'KERING' : 'OMPRENG';
                if (menuType === 'KERING') hasKering = true;
                if (menuType === 'OMPRENG') hasMasak = true;
            } else {
                hasMasak = true; // Fallback
            }
            return {
                ...item,
                unit: item.ingredient?.unit,
                ingredientName: item.ingredient?.name,
                note: item.note, // Fixed: use note for ReceiptItem
                menuType
            };
        });

        let title = '📦 Penerimaan Barang';
        if (isOp) {
            title = '📦 Penerimaan Barang Operasional';
        } else {
            if (hasKering && hasMasak) title = '📦 Penerimaan Masakan & Snack';
            else if (hasKering) title = '📦 Penerimaan Barang Snack';
            else title = '📦 Penerimaan Barang Masakan';
        }

        events.push({
            id: `receipt-${r.id}`,
            type: 'receipt',
            title,
            description: isOp ? `Barang diterima di gudang.` : `Barang diterima di gudang.`,
            timestamp: r.createdAt.toISOString(),
            user: (plain as any).receiver?.name || 'Aslap',
            status: r.status,
            data: { ...plain, items, date: plain.receivedAt, receiverName: (plain as any).receiver?.name, purchaseType }
        });
    });

    // 4. Productions (Chef)
    if (types.includes('production')) {
        try {
            const productions = await Production.findAll({
                where: { createdAt: { [Op.between]: [start, end] } },
                include: [
                    { model: Menu, as: 'menu', attributes: ['name', 'menuType'] },
                    { model: User, as: 'chef', attributes: ['name'] },
                    { model: ProductionItem, as: 'items', include: [{ model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] }] }
                ],
                order: [['createdAt', 'DESC']],
                limit: 50
            });
            productions.forEach(p => {
                const plain = p.toJSON();
                const menuType = (plain as any).menu?.menuType;
                const menuTypeLabel = menuType === 'KERING' ? 'Snack/Kering' : 'Masakan/Ompreng';
                const icon = menuType === 'KERING' ? '🍪' : '🥘';
                // Ensure items have unit from ingredient
                const items = ((plain as any).items || []).map((item: any) => ({
                    ...item,
                    unit: item.ingredient?.unit,
                    ingredientName: item.ingredient?.name
                }));
                events.push({
                    id: `prod-${p.id}`,
                    type: 'production',
                    title: `${icon} Produksi ${menuTypeLabel} Selesai`,
                    description: `Penyelesaian: ${(plain as any).menu?.name || 'Unknown'}`,
                    timestamp: p.createdAt.toISOString(),
                    user: (plain as any).chef?.name || 'Chef',
                    data: {
                        ...plain,
                        items,
                        date: plain.productionDate,
                        menuName: (plain as any).menu?.name,
                        menuType: (plain as any).menu?.menuType,
                        chefName: (plain as any).chef?.name,
                        portions: plain.totalPortions
                    } // Normalize
                });
            });
        } catch (err) {
            console.error('[HistoryAction] Production fetch error:', err);
        }
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
