import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

interface MenuAttributes {
    id: string;
    name: string;
    menuType?: 'OMPRENG' | 'KERING';
    nutritionData?: any; // JSON object storing {"bumil": {"energi": 611, ...}, "kecil": {...}}
    menuDate: Date;
    description?: string;
    countKecil?: number;
    countBesar?: number;
    countBumil?: number;
    countBalita?: number;
    createdBy: string;
    evaluation?: string;
    rating?: number;
    evaluatorId?: string;
    editHistory?: any;
    createdAt?: Date;
    updatedAt?: Date;
}

interface MenuCreationAttributes extends Optional<MenuAttributes, 'id'> { }

class Menu extends Model<MenuAttributes, MenuCreationAttributes> implements MenuAttributes {
    declare public id: string;
    declare public name: string;
    declare public menuType: 'OMPRENG' | 'KERING';
    declare public nutritionData: any;
    declare public menuDate: Date;
    declare public description: string;
    declare public countKecil: number;
    declare public countBesar: number;
    declare public countBumil: number;
    declare public countBalita: number;
    declare public createdBy: string;
    declare public evaluation: string;
    declare public rating: number;
    declare public evaluatorId: string;
    declare public editHistory: any;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

Menu.init(
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
        menuType: {
            type: DataTypes.ENUM('OMPRENG', 'KERING'),
            allowNull: false,
            defaultValue: 'OMPRENG',
            field: 'menu_type'
        },
        nutritionData: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'nutrition_data'
        },
        menuDate: {
            type: DataTypes.DATE, // includes time, but we might just care about date part logic
            allowNull: false,
            field: 'menu_date'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'created_by'
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
        evaluation: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        evaluatorId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'evaluator_id'
        },
        editHistory: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'edit_history'
        },
    },
    {
        sequelize,
        tableName: 'menus',
        timestamps: true,
    }
);

export default Menu;
