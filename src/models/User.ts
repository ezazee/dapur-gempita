import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import Role from './Role';

export interface UserAttributes {
    id: string;
    email: string;
    password: string;
    name: string;
    roleId: number;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isActive'> { }

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    declare public id: string;
    declare public email: string;
    declare public password: string;
    declare public name: string;
    declare public roleId: number;
    declare public isActive: boolean;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;

    // Association mixin
    declare public role?: Role;

    // Explicitly declare static methods if inference fails
    // However, with @types/sequelize installed, this *should* work automatically.
    // If it fails, it usually means the class definition doesn't match the interface exacty or types are stale.
}

User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        roleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'role_id'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
    },
    {
        sequelize,
        tableName: 'users',
        timestamps: true, // adds createdAt and updatedAt
    }
);

export default User;
