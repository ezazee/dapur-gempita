import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
    await queryInterface.addColumn('menus', 'evaluation', {
        type: DataTypes.TEXT,
        allowNull: true
    });
    await queryInterface.addColumn('menus', 'rating', {
        type: DataTypes.INTEGER,
        allowNull: true
    });
    await queryInterface.addColumn('menus', 'evaluator_id', {
        type: DataTypes.UUID,
        allowNull: true
    });
}

export async function down(queryInterface: QueryInterface) {
    await queryInterface.removeColumn('menus', 'evaluation');
    await queryInterface.removeColumn('menus', 'rating');
    await queryInterface.removeColumn('menus', 'evaluator_id');
}
