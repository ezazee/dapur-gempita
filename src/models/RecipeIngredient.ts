import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

export interface RecipeIngredientAttributes {
    id: string;
    recipeId: string;
    ingredientId: string;
    qtyBesar: number;
    qtyKecil?: number;
    qtyBumil?: number;
    qtyBalita?: number;
    isSecukupnya?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface RecipeIngredientCreationAttributes extends Optional<RecipeIngredientAttributes, 'id'> { }

class RecipeIngredient extends Model<RecipeIngredientAttributes, RecipeIngredientCreationAttributes> implements RecipeIngredientAttributes {
    declare public id: string;
    declare public recipeId: string;
    declare public ingredientId: string;
    declare public qtyBesar: number;
    declare public qtyKecil: number;
    declare public qtyBumil: number;
    declare public qtyBalita: number;
    declare public isSecukupnya: boolean;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

RecipeIngredient.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        recipeId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'recipe_id'
        },
        ingredientId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'ingredient_id'
        },
        qtyBesar: {
            type: DataTypes.FLOAT,
            allowNull: false,
            field: 'qty_besar'
        },
        qtyKecil: {
            type: DataTypes.FLOAT,
            allowNull: true,
            field: 'qty_kecil'
        },
        qtyBumil: {
            type: DataTypes.FLOAT,
            allowNull: true,
            field: 'qty_bumil'
        },
        qtyBalita: {
            type: DataTypes.FLOAT,
            allowNull: true,
            field: 'qty_balita'
        },
        isSecukupnya: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_secukupnya'
        },
    },
    {
        sequelize,
        tableName: 'recipe_ingredients',
        timestamps: true,
    }
);

export default RecipeIngredient;
