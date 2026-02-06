import { sequelize } from './lib/sequelize';

async function runMigration() {
    try {
        console.log('Adding photo_url column to receipt_items...');

        await sequelize.query(`
            ALTER TABLE receipt_items 
            ADD COLUMN IF NOT EXISTS photo_url TEXT;
        `);

        console.log('✅ Migration complete: photo_url column added to receipt_items');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
