import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

interface MenuAttributes {
    id: string;
    name: string;
    menuDate: Date;
    description?: string;
    createdBy: string;
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
    },
    {
        sequelize,
        tableName: 'menus',
        timestamps: true,
    }
);

export default Menu;
