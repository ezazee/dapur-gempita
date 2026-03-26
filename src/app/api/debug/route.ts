import { NextResponse } from 'next/server';
import { Ingredient } from '@/models';

import { getSession } from '@/app/actions/auth';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
