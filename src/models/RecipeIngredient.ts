import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

export interface RecipeIngredientAttributes {
    id: string;
    recipeId: string;
    ingredientId: string;
    qtyPerPortion: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface RecipeIngredientCreationAttributes extends Optional<RecipeIngredientAttributes, 'id'> { }

class RecipeIngredient extends Model<RecipeIngredientAttributes, RecipeIngredientCreationAttributes> implements RecipeIngredientAttributes {
    declare public id: string;
    declare public recipeId: string;
    declare public ingredientId: string;
    declare public qtyPerPortion: number;
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
        qtyPerPortion: {
            type: DataTypes.FLOAT, // Use FLOAT for precision like 0.005 kg
            allowNull: false,
            field: 'qty_per_portion'
        },
    },
    {
        sequelize,
        tableName: 'recipe_ingredients',
        timestamps: true,
    }
);

export default RecipeIngredient;
