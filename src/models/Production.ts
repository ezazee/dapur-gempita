import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

interface ProductionAttributes {
    id: string;
    menuId: string;
    productionDate: Date;
    totalPortions: number;
    note?: string;
    photoUrl?: string;
    createdBy: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ProductionCreationAttributes extends Optional<ProductionAttributes, 'id'> { }

class Production extends Model<ProductionAttributes, ProductionCreationAttributes> implements ProductionAttributes {
    declare public id: string;
    declare public menuId: string;
    declare public productionDate: Date;
    declare public totalPortions: number;
    declare public note: string;
    declare public photoUrl?: string;
    declare public createdBy: string;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

Production.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        menuId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'menu_id'
        },
        productionDate: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'production_date'
        },
        totalPortions: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'total_portions'
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        photoUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'photo_url'
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'created_by'
        },
    },
    {
        sequelize,
        tableName: 'productions',
        timestamps: true,
    }
);

export default Production;
