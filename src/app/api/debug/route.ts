import { NextResponse } from 'next/server';
import { Ingredient } from '@/models';

export async function GET() {
    try {
        const allIngredients = await Ingredient.findAll({
            attributes: ['id', 'name', 'unit'],
            order: [['name', 'ASC']]
        });

        return NextResponse.json({
            total: allIngredients.length,
            ingredients: allIngredients
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
