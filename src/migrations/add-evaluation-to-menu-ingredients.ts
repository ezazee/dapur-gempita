import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
    await queryInterface.addColumn('menu_ingredients', 'evaluation_status', {
        type: DataTypes.ENUM('PAS', 'KURANG', 'BERLEBIH'),
        allowNull: true
    });
    await queryInterface.addColumn('menu_ingredients', 'evaluation_note', {
        type: DataTypes.TEXT,
        allowNull: true
    });
}

export async function down(queryInterface: QueryInterface) {
    await queryInterface.removeColumn('menu_ingredients', 'evaluation_status');
    await queryInterface.removeColumn('menu_ingredients', 'evaluation_note');
}
