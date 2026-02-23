import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
    await queryInterface.addColumn('menu_ingredients', 'gramasi', {
        type: DataTypes.DOUBLE,
        allowNull: true,
        comment: 'Gramasi per porsi (snapshot dari kamus resep saat menu dibuat)'
    });
}

export async function down(queryInterface: QueryInterface) {
    await queryInterface.removeColumn('menu_ingredients', 'gramasi');
}
