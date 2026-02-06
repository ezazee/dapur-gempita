import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

export interface MenuIngredientAttributes {
    id: string;
    menuId: string;
    ingredientId: string;
    qtyNeeded: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface MenuIngredientCreationAttributes extends Optional<MenuIngredientAttributes, 'id'> { }

class MenuIngredient extends Model<MenuIngredientAttributes, MenuIngredientCreationAttributes> implements MenuIngredientAttributes {
    declare public id: string;
    declare public menuId: string;
    declare public ingredientId: string;
    declare public qtyNeeded: number;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

MenuIngredient.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        menuId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'menu_id'
        },
        ingredientId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'ingredient_id'
        },
        qtyNeeded: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            field: 'qty_needed'
        },
    },
    {
        sequelize,
        tableName: 'menu_ingredients',
        timestamps: true,
    }
);

export default MenuIngredient;
