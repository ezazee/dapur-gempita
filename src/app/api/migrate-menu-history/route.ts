import { NextResponse } from 'next/server';
import { sequelize } from '@/models';

export async function GET() {
    try {
        await sequelize.query(`
      ALTER TABLE menus 
      ADD COLUMN IF NOT EXISTS edit_history JSONB;
    `);

        return NextResponse.json({ success: true, message: "Added edit_history column" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
