import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/lib/sequelize';

export interface ProductionItemAttributes {
    id: string;
    productionId: string;
    ingredientId: string;
    qtyUsed: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ProductionItemCreationAttributes extends Optional<ProductionItemAttributes, 'id'> { }

class ProductionItem extends Model<ProductionItemAttributes, ProductionItemCreationAttributes> implements ProductionItemAttributes {
    declare public id: string;
    declare public productionId: string;
    declare public ingredientId: string;
    declare public qtyUsed: number;
    declare public readonly createdAt: Date;
    declare public readonly updatedAt: Date;
}

ProductionItem.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        productionId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'production_id'
        },
        ingredientId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'ingredient_id'
        },
        qtyUsed: {
            type: DataTypes.DOUBLE,
            allowNull: false,
            field: 'qty_used'
        },
    },
    {
        sequelize,
        tableName: 'production_items',
        timestamps: true,
    }
);

export default ProductionItem;
