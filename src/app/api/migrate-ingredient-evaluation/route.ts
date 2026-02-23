import { NextResponse } from 'next/server';
import { sequelize } from '@/lib/sequelize';
import * as migration from '@/migrations/add-evaluation-to-menu-ingredients';

export async function GET() {
    try {
        await migration.up(sequelize.getQueryInterface());
        return NextResponse.json({ success: true, message: 'Migration added evaluation columns to menu_ingredients' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
