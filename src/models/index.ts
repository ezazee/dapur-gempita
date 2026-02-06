import Ingredient from './Ingredient';
import Menu from './Menu';
import Production from './Production';
import Purchase from './Purchase';
import Receipt from './Receipt';
import StockMovement from './StockMovement';
import User from './User';
import Role from './Role';
import MenuIngredient from './MenuIngredient';
import PurchaseItem from './PurchaseItem';
import ReceiptItem from './ReceiptItem';
import ProductionItem from './ProductionItem';
import ReportImage from './ReportImage';
import AuditLog from './AuditLog';
import { sequelize } from '@/lib/sequelize';

// User & Role
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// Menu & Ingredients
Menu.belongsToMany(Ingredient, { through: MenuIngredient, foreignKey: 'menuId', otherKey: 'ingredientId', as: 'ingredients' });
Ingredient.belongsToMany(Menu, { through: MenuIngredient, foreignKey: 'ingredientId', otherKey: 'menuId', as: 'menus' });
Menu.hasMany(MenuIngredient, { foreignKey: 'menuId', as: 'items' });
MenuIngredient.belongsTo(Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });

// Purchase & Items
Purchase.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Purchase.hasMany(PurchaseItem, { foreignKey: 'purchaseId', as: 'items' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchaseId', as: 'purchase' });
PurchaseItem.belongsTo(Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });

// Receipt & Items
Receipt.belongsTo(Purchase, { foreignKey: 'purchaseId', as: 'purchase' });
Purchase.hasOne(Receipt, { foreignKey: 'purchaseId', as: 'receipt' });
Receipt.belongsTo(User, { foreignKey: 'receivedBy', as: 'receiver' });
Receipt.hasMany(ReceiptItem, { foreignKey: 'receiptId', as: 'items' });
ReceiptItem.belongsTo(Receipt, { foreignKey: 'receiptId', as: 'receipt' });
ReceiptItem.belongsTo(Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });

// Production & Items
Production.belongsTo(Menu, { foreignKey: 'menuId', as: 'menu' });
Menu.hasMany(Production, { foreignKey: 'menuId', as: 'productions' });
Production.belongsTo(User, { foreignKey: 'createdBy', as: 'chef' });
Production.hasMany(ProductionItem, { foreignKey: 'productionId', as: 'items' });
ProductionItem.belongsTo(Production, { foreignKey: 'productionId', as: 'production' });
ProductionItem.belongsTo(Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });

// Stock Movements
StockMovement.belongsTo(Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });
Ingredient.hasMany(StockMovement, { foreignKey: 'ingredientId', as: 'movements' });
StockMovement.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Audit Logs
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
    Ingredient,
    Menu,
    Production,
    Purchase,
    Receipt,
    StockMovement,
    User,
    Role,
    MenuIngredient,
    PurchaseItem,
    ReceiptItem,
    ProductionItem,
    ReportImage,
    AuditLog,
    sequelize
};
