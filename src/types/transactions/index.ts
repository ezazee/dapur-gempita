import { Ingredient } from '../inventory';
import { User } from '../auth';

export type PurchaseStatus = 'waiting' | 'approved' | 'rejected' | 'incomplete' | 'requested';

export interface Purchase {
    id: string;
    purchaseDate: Date | string;
    createdBy: string;
    status: PurchaseStatus;
    note: string | null;
    totalItems: number;
    purchaseType: 'FOOD' | 'OPERATIONAL' | 'FOOD_REQUEST';
    createdAt: Date | string;
    updatedAt: Date | string;
    items?: PurchaseItem[];
    creator?: Partial<User>;
}

export interface PurchaseItem {
    id: string;
    purchaseId: string;
    ingredientId: string;
    ingredientName?: string; // Virtual/Joined
    ingredientUnit?: string; // Virtual/Joined
    estimatedQty: number;
    actualQty?: number;
    unitPrice: number;
    memo?: string;
    photoUrl?: string;
    category?: string;
    createdAt: Date | string;
    ingredient?: Ingredient;
}

export interface Receipt {
    id: string;
    purchaseId: string;
    receivedBy: string;
    status: 'accepted' | 'rejected';
    note: string | null;
    receivedAt: Date | string;
    createdAt: Date | string;
    purchase?: Purchase;
    items?: ReceiptItem[];
    receiver?: Partial<User>;
}

export interface ReceiptItem {
    id: string;
    receiptId: string;
    ingredientId: string;
    grossWeight: number;
    netWeight: number;
    differenceQty: number;
    createdAt: Date | string;
    ingredient?: Ingredient;
}

export interface Menu {
    id: string;
    name: string;
    description: string | null;
    date: Date | string;
    type: 'OMPRENG' | 'KERING';
    createdBy: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    ingredients?: MenuIngredient[];
}

export interface MenuIngredient {
    id: string;
    menuId: string;
    ingredientId: string;
    qtyNeeded: number;
    createdAt: Date | string;
    ingredient?: Ingredient;
}

export interface Production {
    id: string;
    menuId: string;
    productionDate: Date | string;
    createdBy: string;
    portions: number;
    note: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    menu?: Menu;
    items?: ProductionItem[];
}

export interface ProductionItem {
    id: string;
    productionId: string;
    ingredientId: string;
    qtyUsed: number;
    createdAt: Date | string;
    ingredient?: Ingredient;
}
