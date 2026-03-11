export type IngredientCategory = 'MASAK' | 'KERING' | 'OPERASIONAL';

export interface Ingredient {
    id: string;
    name: string;
    unit: string;
    category: IngredientCategory;
    currentStock: number;
    minimumStock: number;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface StockMovement {
    id: string;
    ingredientId: string;
    type: 'IN' | 'OUT' | 'ADJUST';
    referenceTable: string | null;
    referenceId: string | null;
    qty: number;
    balanceBefore: number;
    balanceAfter: number;
    createdBy: string;
    note: string | null;
    createdAt: Date | string;
    ingredient?: Ingredient;
    creator?: { name: string };
}
