import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

interface MenuAttributes {
    id: string;
    name: string;
    menuDate: Date;
    description?: string;
    portionCount?: number;
    createdBy: string;
    evaluation?: string;
    rating?: number;
    evaluatorId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface MenuCreationAttributes extends Optional<MenuAttributes, 'id'> { }

class Menu extends Model<MenuAttributes, MenuCreationAttributes> implements MenuAttributes {
    declare public id: string;
    declare public name: string;
    declare public menuDate: Date;
    declare public description: string;
    declare public createdBy: string;
    declare public evaluation: string;
    declare public rating: number;
    declare public evaluatorId: string;
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
        portionCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            field: 'portion_count'
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
    },
    {
        sequelize,
        tableName: 'menus',
        timestamps: true,
    }
);

export default Menu;
