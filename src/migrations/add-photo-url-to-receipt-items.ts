import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
    await queryInterface.addColumn('receipt_items', 'photo_url', {
        type: DataTypes.TEXT,
        allowNull: true
    });
}

export async function down(queryInterface: QueryInterface) {
    await queryInterface.removeColumn('receipt_items', 'photo_url');
}

// Run this migration manually or use a script
// Example: npx ts-node src/migrations/add-photo-url-to-receipt-items.ts
