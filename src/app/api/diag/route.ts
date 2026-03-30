import { NextResponse } from 'next/server';
import { sequelize } from '@/lib/sequelize';

export async function GET() {
    try {
        await sequelize.authenticate();
        
        const dbUrl = process.env.DATABASE_URL || 'NOT SET';
        // Mask password for security
        const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
        
        // Get actual database name
        const [dbResult] = await sequelize.query('SELECT current_database() as dbname');
        
        // Count recipes and recipe_ingredients
        const [recipeCount] = await sequelize.query('SELECT count(*) FROM recipes');
        const [riCount] = await sequelize.query('SELECT count(*), sum(qty_besar) as sum_qty FROM recipe_ingredients');
        
        // Sample a recipe ingredient
        const [sample] = await sequelize.query(`
            SELECT ri.qty_besar, ri.is_secukupnya, i.name, i.unit, r.name as recipe
            FROM recipe_ingredients ri
            JOIN ingredients i ON ri.ingredient_id = i.id
            JOIN recipes r ON ri.recipe_id = r.id
            LIMIT 3
        `);
        
        return NextResponse.json({
            status: 'connected',
            databaseUrl: maskedUrl,
            currentDatabase: (dbResult[0] as any).dbname,
            recipeCount: (recipeCount[0] as any).count,
            recipeIngredientCount: (riCount[0] as any).count,
            sumQtyBesar: (riCount[0] as any).sum_qty,
            sampleData: sample
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
