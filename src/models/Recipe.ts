import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import User from './User';

interface RecipeAttributes {
    id: string;
    name: string;
    description?: string;
    portionSize: number; // Default 1, base for calculation
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    createdBy: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface RecipeCreationAttributes extends Optional<RecipeAttributes, 'id' | 'portionSize'> { }

class Recipe extends Model<RecipeAttributes, RecipeCreationAttributes> implements RecipeAttributes {
    declare public id: string;
    declare public name: string;
    declare public description: string;
    declare public portionSize: number;
    declare public calories: number;
    declare public carbs: number;
    declare public protein: number;
    declare public fat: number;
    declare public createdBy: string;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

Recipe.init(
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
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        portionSize: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            field: 'portion_size'
        },
        calories: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        carbs: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        protein: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        fat: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'created_by'
        },
    },
    {
        sequelize,
        tableName: 'recipes',
        timestamps: true,
    }
);

export default Recipe;
