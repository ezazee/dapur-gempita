import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

export interface ReceiptItemAttributes {
    id: string;
    receiptId: string;
    ingredientId: string;
    grossWeight: number;
    netWeight: number;
    differenceQty: number;
    photoUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ReceiptItemCreationAttributes extends Optional<ReceiptItemAttributes, 'id'> { }

class ReceiptItem extends Model<ReceiptItemAttributes, ReceiptItemCreationAttributes> implements ReceiptItemAttributes {
    declare public id: string;
    declare public receiptId: string;
    declare public ingredientId: string;
    declare public grossWeight: number;
    declare public netWeight: number;
    declare public differenceQty: number;
    declare public photoUrl?: string;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

ReceiptItem.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        receiptId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'receipt_id'
        },
        ingredientId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'ingredient_id'
        },
        grossWeight: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            field: 'gross_weight'
        },
        netWeight: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            field: 'net_weight'
        },
        differenceQty: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            field: 'difference_qty'
        },
        photoUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'photo_url'
        },
    },
    {
        sequelize,
        tableName: 'receipt_items',
        timestamps: true,
    }
);

export default ReceiptItem;
