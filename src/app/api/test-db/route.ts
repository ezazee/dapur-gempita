import { NextResponse } from 'next/server';
import { sequelize } from '@/lib/sequelize';

export async function GET() {
    try {
        // Test the connection
        await sequelize.authenticate();

        // Optionally query time to be sure
        const [results, metadata] = await sequelize.query("SELECT NOW()");

        return NextResponse.json({
            status: 'success',
            message: 'Connected to Neon via Sequelize successfully!',
            time: results[0]
        });
    } catch (error: any) {
        console.error('Database connection failed:', error);
        return NextResponse.json({
            status: 'error',
            message: 'Failed to connect to database',
            error: error.message
        }, { status: 500 });
    }
}
