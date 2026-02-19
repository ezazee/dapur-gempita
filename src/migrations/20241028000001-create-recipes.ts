'use strict';

import { DataTypes, QueryInterface } from 'sequelize';

module.exports = {
    up: async (queryInterface: QueryInterface, Sequelize: any) => {
        // Create Recipes Table
        await queryInterface.createTable('recipes', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            portion_size: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            created_by: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            }
        });

        // Create Recipe Ingredients Table
        await queryInterface.createTable('recipe_ingredients', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            recipe_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'recipes',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            ingredient_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'ingredients',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            qty_per_portion: {
                type: DataTypes.FLOAT,
                allowNull: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            }
        });
    },

    down: async (queryInterface: QueryInterface, Sequelize: any) => {
        await queryInterface.dropTable('recipe_ingredients');
        await queryInterface.dropTable('recipes');
    }
};
