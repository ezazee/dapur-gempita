import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';
import Role from './Role';
import bcrypt from 'bcryptjs';

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

    // Hook for hashing password
    public static async hashPassword(user: User) {
        if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
    }
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

User.addHook('beforeCreate', User.hashPassword);
User.addHook('beforeUpdate', User.hashPassword);

export default User;
