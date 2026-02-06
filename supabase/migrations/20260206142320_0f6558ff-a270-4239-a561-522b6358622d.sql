-- Fix INPUT_VALIDATION: Add stock quantity validation to trigger functions and database constraints

-- 1. Add database constraints to prevent invalid data at database level
ALTER TABLE public.ingredients
ADD CONSTRAINT ingredients_stock_positive 
CHECK (current_stock >= 0);

ALTER TABLE public.production_items
ADD CONSTRAINT production_qty_positive
CHECK (qty_used > 0);

ALTER TABLE public.receipt_items
ADD CONSTRAINT receipt_weights_positive
CHECK (net_weight > 0 AND gross_weight > 0 AND net_weight <= gross_weight);

-- 2. Update update_stock_on_production function with validation
CREATE OR REPLACE FUNCTION public.update_stock_on_production()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    current_balance DECIMAL(10,2);
    new_balance DECIMAL(10,2);
BEGIN
    FOR item IN SELECT * FROM public.production_items WHERE production_id = NEW.id
    LOOP
        -- Validate quantity is positive
        IF item.qty_used <= 0 THEN
            RAISE EXCEPTION 'Invalid production quantity: % for ingredient %', 
                item.qty_used, item.ingredient_id;
        END IF;
        
        -- Validate quantity is reasonable (not more than 10000 units)
        IF item.qty_used > 10000 THEN
            RAISE EXCEPTION 'Production quantity % exceeds maximum allowed (10000)', 
                item.qty_used;
        END IF;
        
        SELECT current_stock INTO current_balance 
        FROM public.ingredients WHERE id = item.ingredient_id;
        
        -- Validate ingredient exists
        IF current_balance IS NULL THEN
            RAISE EXCEPTION 'Ingredient with ID % does not exist', item.ingredient_id;
        END IF;
        
        -- Calculate new balance
        new_balance := current_balance - item.qty_used;
        
        -- Prevent negative stock
        IF new_balance < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for ingredient %. Required: %, Available: %',
                item.ingredient_id, item.qty_used, current_balance;
        END IF;
        
        UPDATE public.ingredients
        SET current_stock = new_balance, updated_at = now()
        WHERE id = item.ingredient_id;
        
        INSERT INTO public.stock_movements (
            ingredient_id, type, reference_table, reference_id,
            qty, balance_before, balance_after, created_by
        ) VALUES (
            item.ingredient_id, 'OUT', 'productions', NEW.id,
            item.qty_used, current_balance, new_balance, NEW.created_by
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Update update_stock_on_receipt function with validation
CREATE OR REPLACE FUNCTION public.update_stock_on_receipt()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    current_balance DECIMAL(10,2);
    new_balance DECIMAL(10,2);
BEGIN
    IF NEW.status = 'accepted' THEN
        FOR item IN SELECT * FROM public.receipt_items WHERE receipt_id = NEW.id
        LOOP
            -- Validate weights are positive
            IF item.net_weight <= 0 OR item.gross_weight <= 0 THEN
                RAISE EXCEPTION 'Invalid weight values: net_weight=%, gross_weight=%', 
                    item.net_weight, item.gross_weight;
            END IF;
            
            -- Validate net weight is not greater than gross weight
            IF item.net_weight > item.gross_weight THEN
                RAISE EXCEPTION 'Net weight (%) cannot exceed gross weight (%)', 
                    item.net_weight, item.gross_weight;
            END IF;
            
            -- Validate quantity is reasonable
            IF item.net_weight > 10000 THEN
                RAISE EXCEPTION 'Receipt quantity % exceeds maximum allowed (10000)', 
                    item.net_weight;
            END IF;
            
            SELECT current_stock INTO current_balance 
            FROM public.ingredients WHERE id = item.ingredient_id;
            
            -- Validate ingredient exists
            IF current_balance IS NULL THEN
                RAISE EXCEPTION 'Ingredient with ID % does not exist', item.ingredient_id;
            END IF;
            
            -- Calculate new balance
            new_balance := current_balance + item.net_weight;
            
            UPDATE public.ingredients
            SET current_stock = new_balance, updated_at = now()
            WHERE id = item.ingredient_id;
            
            INSERT INTO public.stock_movements (
                ingredient_id, type, reference_table, reference_id,
                qty, balance_before, balance_after, created_by
            ) VALUES (
                item.ingredient_id, 'IN', 'receipts', NEW.id,
                item.net_weight, current_balance, new_balance, NEW.received_by
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;