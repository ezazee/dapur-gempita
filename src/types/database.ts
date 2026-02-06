export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  minimum_stock: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
}

export interface Menu {
  id: string;
  name: string;
  description: string | null;
  menu_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MenuIngredient {
  id: string;
  menu_id: string;
  ingredient_id: string;
  qty_needed: number;
  created_at: string;
  ingredient?: Ingredient;
}

export interface Purchase {
  id: string;
  purchase_date: string;
  created_by: string;
  status: 'draft' | 'waiting' | 'approved' | 'rejected';
  note: string | null;
  total_items: number;
  created_at: string;
  updated_at: string;
  purchase_items?: PurchaseItem[];
  creator?: { name: string };
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  ingredient_id: string;
  estimated_qty: number;
  unit_price: number;
  created_at: string;
  ingredient?: Ingredient;
}

export interface Receipt {
  id: string;
  purchase_id: string;
  received_by: string;
  status: 'accepted' | 'rejected';
  note: string | null;
  received_at: string;
  created_at: string;
  purchase?: Purchase;
  receipt_items?: ReceiptItem[];
  receiver?: { name: string };
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  ingredient_id: string;
  gross_weight: number;
  net_weight: number;
  difference_qty: number;
  created_at: string;
  ingredient?: Ingredient;
}

export interface Production {
  id: string;
  menu_id: string;
  production_date: string;
  created_by: string;
  total_portions: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  menu?: Menu;
  production_items?: ProductionItem[];
  creator?: { name: string };
}

export interface ProductionItem {
  id: string;
  production_id: string;
  ingredient_id: string;
  qty_used: number;
  created_at: string;
  ingredient?: Ingredient;
}

export interface StockMovement {
  id: string;
  ingredient_id: string;
  type: 'IN' | 'OUT' | 'ADJUST';
  reference_table: string | null;
  reference_id: string | null;
  qty: number;
  balance_before: number;
  balance_after: number;
  created_by: string;
  note: string | null;
  created_at: string;
  ingredient?: Ingredient;
  creator?: { name: string };
}

export interface ReportImage {
  id: string;
  entity_type: string;
  entity_id: string;
  file_url: string;
  file_name: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: { name: string };
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'SUPER_ADMIN' | 'AHLI_GIZI' | 'PEMBELI' | 'PENERIMA' | 'CHEF' | 'KEPALA_DAPUR';
  created_at: string;
}
