import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';
import User from './User';

interface NoteAttributes {
    id: string;
    title: string;
    content?: string;
    createdBy: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface NoteCreationAttributes extends Optional<NoteAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class Note extends Model<NoteAttributes, NoteCreationAttributes> implements NoteAttributes {
    public id!: string;
    public title!: string;
    public content!: string;
    public createdBy!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Note.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
}, {
    sequelize,
    modelName: 'Note',
    tableName: 'notes',
});
