import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
    await queryInterface.addColumn('recipes', 'calories', {
        type: DataTypes.FLOAT,
        allowNull: true
    });
    await queryInterface.addColumn('recipes', 'carbs', {
        type: DataTypes.FLOAT,
        allowNull: true
    });
    await queryInterface.addColumn('recipes', 'protein', {
        type: DataTypes.FLOAT,
        allowNull: true
    });
    await queryInterface.addColumn('recipes', 'fat', {
        type: DataTypes.FLOAT,
        allowNull: true
    });
}

export async function down(queryInterface: QueryInterface) {
    await queryInterface.removeColumn('recipes', 'calories');
    await queryInterface.removeColumn('recipes', 'carbs');
    await queryInterface.removeColumn('recipes', 'protein');
    await queryInterface.removeColumn('recipes', 'fat');
}
