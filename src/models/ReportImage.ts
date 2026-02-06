import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

export interface ReportImageAttributes {
    id: string;
    entityType: 'purchase' | 'receipt' | 'production';
    entityId: string;
    fileUrl: string;
    uploadedBy: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ReportImageCreationAttributes extends Optional<ReportImageAttributes, 'id'> { }

class ReportImage extends Model<ReportImageAttributes, ReportImageCreationAttributes> implements ReportImageAttributes {
    declare public id: string;
    declare public entityType: 'purchase' | 'receipt' | 'production';
    declare public entityId: string;
    declare public fileUrl: string;
    declare public uploadedBy: string;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

ReportImage.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        entityType: {
            type: DataTypes.ENUM('purchase', 'receipt', 'production'),
            allowNull: false,
            field: 'entity_type'
        },
        entityId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'entity_id'
        },
        fileUrl: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'file_url'
        },
        uploadedBy: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'uploaded_by'
        },
    },
    {
        sequelize,
        tableName: 'report_images',
        timestamps: true,
    }
);

export default ReportImage;
