import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import Ingredient from './Ingredient';

interface StockMovementAttributes {
    id: string;
    ingredientId: string;
    type: 'IN' | 'OUT' | 'ADJUST';
    qty: number;
    balanceBefore: number;
    balanceAfter: number;
    referenceTable?: string;
    referenceId?: string;
    note?: string;
    createdBy: string;
    createdAt?: Date;
}

interface StockMovementCreationAttributes extends Optional<StockMovementAttributes, 'id'> { }

class StockMovement extends Model<StockMovementAttributes, StockMovementCreationAttributes> implements StockMovementAttributes {
    declare public id: string;
    declare public ingredientId: string;
    declare public type: 'IN' | 'OUT' | 'ADJUST';
    declare public qty: number;
    declare public balanceBefore: number;
    declare public balanceAfter: number;
    declare public referenceTable: string;
    declare public referenceId: string;
    declare public note: string;
    declare public createdBy: string;
    declare public readonly createdAt: Date;

    // associations
    declare public readonly ingredient?: Ingredient;
}

StockMovement.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        ingredientId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'ingredient_id'
        },
        type: {
            type: DataTypes.ENUM('IN', 'OUT', 'ADJUST'),
            allowNull: false,
        },
        qty: {
            type: DataTypes.DOUBLE,
            allowNull: false,
        },
        balanceBefore: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            field: 'balance_before'
        },
        balanceAfter: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            field: 'balance_after'
        },
        referenceTable: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'reference_table'
        },
        referenceId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'reference_id'
        },
        note: {
            type: DataTypes.TEXT,
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
        tableName: 'stock_movements',
        timestamps: true,
        updatedAt: false,
    }
);

export default StockMovement;
