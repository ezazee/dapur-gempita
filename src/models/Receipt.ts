import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

interface ReceiptAttributes {
    id: string;
    purchaseId: string;
    receivedAt: Date;
    receivedBy: string;
    status: 'accepted' | 'rejected';
    note?: string;
    createdAt?: Date;
}

interface ReceiptCreationAttributes extends Optional<ReceiptAttributes, 'id' | 'receivedAt' | 'status'> { }

class Receipt extends Model<ReceiptAttributes, ReceiptCreationAttributes> implements ReceiptAttributes {
    declare public id: string;
    declare public purchaseId: string;
    declare public receivedAt: Date;
    declare public receivedBy: string;
    declare public status: 'accepted' | 'rejected';
    declare public note: string;
    declare public readonly createdAt: Date;
}

Receipt.init(
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
        receivedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'received_at'
        },
        receivedBy: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'received_by'
        },
        status: {
            type: DataTypes.ENUM('accepted', 'rejected'),
            allowNull: false,
            defaultValue: 'accepted',
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'receipts',
        timestamps: true,
        updatedAt: false,
    }
);

export default Receipt;
