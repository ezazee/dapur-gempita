import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

interface PurchaseAttributes {
    id: string;
    purchaseDate: Date;
    status: 'draft' | 'waiting' | 'approved' | 'rejected';
    totalItems: number;
    note?: string;
    createdBy: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface PurchaseCreationAttributes extends Optional<PurchaseAttributes, 'id' | 'status' | 'totalItems'> { }

class Purchase extends Model<PurchaseAttributes, PurchaseCreationAttributes> implements PurchaseAttributes {
    declare public id: string;
    declare public purchaseDate: Date;
    declare public status: 'draft' | 'waiting' | 'approved' | 'rejected';
    declare public totalItems: number;
    declare public note: string;
    declare public createdBy: string;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

Purchase.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        purchaseDate: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'purchase_date'
        },
        status: {
            type: DataTypes.ENUM('draft', 'waiting', 'approved', 'rejected'),
            allowNull: false,
            defaultValue: 'draft',
        },
        totalItems: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'total_items'
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
        tableName: 'purchases',
        timestamps: true,
    }
);

export default Purchase;
