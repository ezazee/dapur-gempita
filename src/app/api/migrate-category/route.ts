import { NextResponse } from 'next/server';
import { sequelize } from '@/models';

export async function GET() {
    try {
        await sequelize.query(`
      ALTER TABLE ingredients 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'MASAK' NOT NULL;
    `);

        return NextResponse.json({ success: true, message: "Added category column" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
