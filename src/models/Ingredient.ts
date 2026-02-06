import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

interface IngredientAttributes {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    minimumStock: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IngredientCreationAttributes extends Optional<IngredientAttributes, 'id' | 'currentStock' | 'minimumStock'> { }

class Ingredient extends Model<IngredientAttributes, IngredientCreationAttributes> implements IngredientAttributes {
    declare public id: string;
    declare public name: string;
    declare public unit: string;
    declare public currentStock: number;
    declare public minimumStock: number;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

Ingredient.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        currentStock: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            defaultValue: 0,
            field: 'current_stock'
        },
        minimumStock: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            defaultValue: 0,
            field: 'minimum_stock'
        },
    },
    {
        sequelize,
        tableName: 'ingredients',
        timestamps: true,
    }
);

export default Ingredient;
