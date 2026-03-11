import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

interface ProductionAttributes {
    id: string;
    menuId: string;
    productionDate: Date;
    countKecil: number;
    countBesar: number;
    countBumil: number;
    countBalita: number;
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
    declare public countKecil: number;
    declare public countBesar: number;
    declare public countBumil: number;
    declare public countBalita: number;
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
        countKecil: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'count_kecil'
        },
        countBesar: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'count_besar'
        },
        countBumil: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'count_bumil'
        },
        countBalita: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'count_balita'
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
