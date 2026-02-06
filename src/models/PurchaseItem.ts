import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

export interface PurchaseItemAttributes {
    id: string;
    purchaseId: string;
    ingredientId: string;
    estimatedQty: number;
    photoUrl?: string; // Optional per item
    memo?: string; // Reason for qty change/shortage
    createdAt?: Date;
    updatedAt?: Date;
}

interface PurchaseItemCreationAttributes extends Optional<PurchaseItemAttributes, 'id'> { }

class PurchaseItem extends Model<PurchaseItemAttributes, PurchaseItemCreationAttributes> implements PurchaseItemAttributes {
    declare public id: string;
    declare public purchaseId: string;
    declare public ingredientId: string;
    declare public estimatedQty: number;
    declare public photoUrl: string;
    declare public memo: string;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

PurchaseItem.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        purchaseId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'purchase_id'
        },
        ingredientId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'ingredient_id'
        },
        estimatedQty: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            field: 'estimated_qty'
        },
        photoUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'photo_url'
        },
        memo: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'memo'
        },
    },
    {
        sequelize,
        tableName: 'purchase_items',
        timestamps: true,
    }
);

export default PurchaseItem;
