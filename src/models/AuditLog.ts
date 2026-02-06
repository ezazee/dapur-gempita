import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

export interface AuditLogAttributes {
    id: string;
    userId: string;
    action: string;
    tableName: string;
    recordId: string;
    oldData?: any;
    newData?: any;
    createdAt?: Date;
    updatedAt?: Date;
}

interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'oldData' | 'newData'> { }

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
    declare public id: string;
    declare public userId: string;
    declare public action: string;
    declare public tableName: string;
    declare public recordId: string;
    declare public oldData: any;
    declare public newData: any;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

AuditLog.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'user_id'
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        tableName: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'table_name'
        },
        recordId: {
            type: DataTypes.STRING, // Use string to support UUIDs
            allowNull: false,
            field: 'record_id'
        },
        oldData: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'old_data'
        },
        newData: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'new_data'
        }
    },
    {
        sequelize,
        tableName: 'audit_logs',
        timestamps: true,
    }
);

export default AuditLog;
