'use server';

import { StockMovement, Ingredient, User, Purchase, Production, sequelize } from '@/models';
import { getSession } from './auth';

export async function getStockMovements() {
    try {
        const moves = await StockMovement.findAll({
            include: [
                { model: Ingredient, as: 'ingredient', attributes: ['name', 'unit'] },
                { model: User, as: 'creator', attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        return moves.map((m: any) => ({
            id: m.id,
            date: m.createdAt.toISOString(),
            ingredientName: m.ingredient?.name,
            type: m.type, // IN, OUT, ADJUST
            qty: m.qty,
            unit: m.ingredient?.unit,
            balanceAfter: m.balanceAfter,
            note: m.note,
            creatorName: m.creator?.name
        }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getReportSummary() {
    try {
        const [totalIng, lowStockIng, pendingPurchases, todayProduction] = await Promise.all([
            Ingredient.count(),
            Ingredient.count({ where: sequelize.literal('"currentStock" <= "minimumStock"') }),
            Purchase.count({ where: { status: 'waiting' } }),
            Production.count({
                where: sequelize.where(sequelize.fn('date', sequelize.col('productionDate')), '=', new Date().toISOString().split('T')[0])
            })
        ]);

        return {
            totalIng,
            lowStockIng,
            pendingPurchases,
            todayProduction
        };
    } catch (e) {
        return {
            totalIng: 0, lowStockIng: 0, pendingPurchases: 0, todayProduction: 0
        };
    }
}
