-- =============================================
-- KITCHEN INVENTORY MANAGEMENT SYSTEM
-- Complete Database Schema
-- =============================================

-- Create ENUM types
CREATE TYPE public.app_role AS ENUM ('SUPER_ADMIN', 'AHLI_GIZI', 'PEMBELI', 'PENERIMA', 'CHEF', 'KEPALA_DAPUR');
CREATE TYPE public.purchase_status AS ENUM ('draft', 'waiting', 'approved', 'rejected');
CREATE TYPE public.receipt_status AS ENUM ('accepted', 'rejected');
CREATE TYPE public.stock_movement_type AS ENUM ('IN', 'OUT', 'ADJUST');

-- =============================================
-- 1. PROFILES TABLE (user info linked to auth.users)
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 2. USER_ROLES TABLE (separate table for security)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- =============================================
-- 3. INGREDIENTS TABLE (master bahan baku)
-- =============================================
CREATE TABLE public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    minimum_stock DECIMAL(10,2) DEFAULT 0 NOT NULL,
    current_stock DECIMAL(10,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 4. MENUS TABLE
-- =============================================
CREATE TABLE public.menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    menu_date DATE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 5. MENU_INGREDIENTS TABLE (resep)
-- =============================================
CREATE TABLE public.menu_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID REFERENCES public.menus(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT NOT NULL,
    qty_needed DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 6. PURCHASES TABLE
-- =============================================
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_date DATE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    status purchase_status DEFAULT 'draft' NOT NULL,
    note TEXT,
    total_items INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 7. PURCHASE_ITEMS TABLE
-- =============================================
CREATE TABLE public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT NOT NULL,
    estimated_qty DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 8. RECEIPTS TABLE (penerimaan barang)
-- =============================================
CREATE TABLE public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE RESTRICT NOT NULL,
    received_by UUID REFERENCES auth.users(id) NOT NULL,
    status receipt_status NOT NULL,
    note TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 9. RECEIPT_ITEMS TABLE
-- =============================================
CREATE TABLE public.receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT NOT NULL,
    gross_weight DECIMAL(10,2) NOT NULL,
    net_weight DECIMAL(10,2) NOT NULL,
    difference_qty DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 10. PRODUCTIONS TABLE
-- =============================================
CREATE TABLE public.productions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID REFERENCES public.menus(id) ON DELETE RESTRICT NOT NULL,
    production_date DATE NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    total_portions INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 11. PRODUCTION_ITEMS TABLE
-- =============================================
CREATE TABLE public.production_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_id UUID REFERENCES public.productions(id) ON DELETE CASCADE NOT NULL,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT NOT NULL,
    qty_used DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 12. STOCK_MOVEMENTS TABLE (audit trail stok)
-- =============================================
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT NOT NULL,
    type stock_movement_type NOT NULL,
    reference_table TEXT,
    reference_id UUID,
    qty DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 13. REPORT_IMAGES TABLE (foto bukti)
-- =============================================
CREATE TABLE public.report_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT,
    uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 14. AUDIT_LOGS TABLE
-- =============================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any of specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE user_id = _user_id),
    false
  )
$$;

-- =============================================
-- RLS POLICIES - PROFILES
-- =============================================
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- RLS POLICIES - USER_ROLES
-- =============================================
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- RLS POLICIES - INGREDIENTS
-- =============================================
CREATE POLICY "All authenticated users can view ingredients"
ON public.ingredients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and Ahli Gizi can manage ingredients"
ON public.ingredients FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'AHLI_GIZI']::app_role[]));

-- =============================================
-- RLS POLICIES - MENUS
-- =============================================
CREATE POLICY "All authenticated users can view menus"
ON public.menus FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Ahli Gizi and Admins can manage menus"
ON public.menus FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'AHLI_GIZI']::app_role[]));

-- =============================================
-- RLS POLICIES - MENU_INGREDIENTS
-- =============================================
CREATE POLICY "All authenticated users can view menu ingredients"
ON public.menu_ingredients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Ahli Gizi and Admins can manage menu ingredients"
ON public.menu_ingredients FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'AHLI_GIZI']::app_role[]));

-- =============================================
-- RLS POLICIES - PURCHASES
-- =============================================
CREATE POLICY "Pembeli can view their own purchases"
ON public.purchases FOR SELECT
TO authenticated
USING (auth.uid() = created_by OR public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PENERIMA', 'KEPALA_DAPUR']::app_role[]));

CREATE POLICY "Pembeli can create purchases"
ON public.purchases FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PEMBELI']::app_role[]));

CREATE POLICY "Pembeli can update their draft purchases"
ON public.purchases FOR UPDATE
TO authenticated
USING (
  (auth.uid() = created_by AND status = 'draft')
  OR public.has_role(auth.uid(), 'SUPER_ADMIN')
);

CREATE POLICY "Admins can delete purchases"
ON public.purchases FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- RLS POLICIES - PURCHASE_ITEMS
-- =============================================
CREATE POLICY "Users can view purchase items of accessible purchases"
ON public.purchase_items FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.purchases p 
  WHERE p.id = purchase_id 
  AND (p.created_by = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PENERIMA', 'KEPALA_DAPUR']::app_role[]))
));

CREATE POLICY "Pembeli can manage purchase items"
ON public.purchase_items FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PEMBELI']::app_role[]));

-- =============================================
-- RLS POLICIES - RECEIPTS
-- =============================================
CREATE POLICY "Penerima and admins can view receipts"
ON public.receipts FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PENERIMA', 'PEMBELI', 'KEPALA_DAPUR']::app_role[]));

CREATE POLICY "Penerima can create receipts"
ON public.receipts FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PENERIMA']::app_role[]));

CREATE POLICY "Penerima can update receipts"
ON public.receipts FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PENERIMA']::app_role[]));

-- =============================================
-- RLS POLICIES - RECEIPT_ITEMS
-- =============================================
CREATE POLICY "Users can view receipt items"
ON public.receipt_items FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PENERIMA', 'PEMBELI', 'KEPALA_DAPUR']::app_role[]));

CREATE POLICY "Penerima can manage receipt items"
ON public.receipt_items FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PENERIMA']::app_role[]));

-- =============================================
-- RLS POLICIES - PRODUCTIONS
-- =============================================
CREATE POLICY "Chef and admins can view productions"
ON public.productions FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'CHEF', 'KEPALA_DAPUR', 'AHLI_GIZI']::app_role[]));

CREATE POLICY "Chef can create productions"
ON public.productions FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'CHEF']::app_role[]));

CREATE POLICY "Chef can update their productions"
ON public.productions FOR UPDATE
TO authenticated
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- RLS POLICIES - PRODUCTION_ITEMS
-- =============================================
CREATE POLICY "Users can view production items"
ON public.production_items FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'CHEF', 'KEPALA_DAPUR', 'AHLI_GIZI']::app_role[]));

CREATE POLICY "Chef can manage production items"
ON public.production_items FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'CHEF']::app_role[]));

-- =============================================
-- RLS POLICIES - STOCK_MOVEMENTS
-- =============================================
CREATE POLICY "All authenticated can view stock movements"
ON public.stock_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System and admins can create stock movements"
ON public.stock_movements FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'PENERIMA', 'CHEF']::app_role[]));

CREATE POLICY "Only admins can update stock movements"
ON public.stock_movements FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- RLS POLICIES - REPORT_IMAGES
-- =============================================
CREATE POLICY "All authenticated can view report images"
ON public.report_images FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can upload report images"
ON public.report_images FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage all report images"
ON public.report_images FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- RLS POLICIES - AUDIT_LOGS
-- =============================================
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN', 'KEPALA_DAPUR']::app_role[]));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

-- Auto update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update stock on receipt accepted
CREATE OR REPLACE FUNCTION public.update_stock_on_receipt()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    current_balance DECIMAL(10,2);
BEGIN
    IF NEW.status = 'accepted' THEN
        FOR item IN SELECT * FROM public.receipt_items WHERE receipt_id = NEW.id
        LOOP
            SELECT current_stock INTO current_balance 
            FROM public.ingredients WHERE id = item.ingredient_id;
            
            UPDATE public.ingredients
            SET current_stock = current_stock + item.net_weight
            WHERE id = item.ingredient_id;
            
            INSERT INTO public.stock_movements (
                ingredient_id, type, reference_table, reference_id,
                qty, balance_before, balance_after, created_by
            ) VALUES (
                item.ingredient_id, 'IN', 'receipts', NEW.id,
                item.net_weight, current_balance, current_balance + item.net_weight, NEW.received_by
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update stock on production
CREATE OR REPLACE FUNCTION public.update_stock_on_production()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    current_balance DECIMAL(10,2);
BEGIN
    FOR item IN SELECT * FROM public.production_items WHERE production_id = NEW.id
    LOOP
        SELECT current_stock INTO current_balance 
        FROM public.ingredients WHERE id = item.ingredient_id;
        
        UPDATE public.ingredients
        SET current_stock = current_stock - item.qty_used
        WHERE id = item.ingredient_id;
        
        INSERT INTO public.stock_movements (
            ingredient_id, type, reference_table, reference_id,
            qty, balance_before, balance_after, created_by
        ) VALUES (
            item.ingredient_id, 'OUT', 'productions', NEW.id,
            item.qty_used, current_balance, current_balance - item.qty_used, NEW.created_by
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- CREATE TRIGGERS
-- =============================================
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at
    BEFORE UPDATE ON public.ingredients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menus_updated_at
    BEFORE UPDATE ON public.menus
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_productions_updated_at
    BEFORE UPDATE ON public.productions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_receipt_status_change
    AFTER UPDATE OF status ON public.receipts
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.update_stock_on_receipt();

CREATE TRIGGER on_production_created
    AFTER INSERT ON public.productions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_stock_on_production();

-- =============================================
-- CREATE STORAGE BUCKET
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-images',
    'report-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies
CREATE POLICY "Anyone can view report images"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-images');

CREATE POLICY "Authenticated users can upload report images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-images');

CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'report-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete report images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'report-images' AND public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_ingredients_name ON public.ingredients(name);
CREATE INDEX idx_menus_date ON public.menus(menu_date);
CREATE INDEX idx_purchases_date ON public.purchases(purchase_date);
CREATE INDEX idx_purchases_status ON public.purchases(status);
CREATE INDEX idx_receipts_purchase ON public.receipts(purchase_id);
CREATE INDEX idx_productions_date ON public.productions(production_date);
CREATE INDEX idx_stock_movements_ingredient ON public.stock_movements(ingredient_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_report_images_entity ON public.report_images(entity_type, entity_id);