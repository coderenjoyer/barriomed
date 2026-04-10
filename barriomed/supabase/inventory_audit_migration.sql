-- ─── Inventory Audit Logging Enhancement ────────────────────────────────────
-- Adds structured old_value / new_value / role columns to admin_logs
-- to satisfy the full audit specification.
-- This migration is incremental and safe to run on an existing table.

-- 1. Add structured audit columns
ALTER TABLE public.admin_logs
    ADD COLUMN IF NOT EXISTS old_value         JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS new_value         JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS performed_by_role TEXT  DEFAULT NULL;

-- 2. Index for fast filtering of inventory audit entries
CREATE INDEX IF NOT EXISTS admin_logs_resource_id_idx
    ON public.admin_logs(resource_id);

CREATE INDEX IF NOT EXISTS admin_logs_performed_by_role_idx
    ON public.admin_logs(performed_by_role);

-- ─── Inventory table: ensure add-medicine is supported ───────────────────────
-- The inventory table should already exist. This ensures required columns exist.
ALTER TABLE public.inventory
    ADD COLUMN IF NOT EXISTS created_by  TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT now();

-- ─── Notes ───────────────────────────────────────────────────────────────────
-- Existing RLS policies remain intact (system_admin can INSERT/SELECT, no DELETE/UPDATE).
-- old_value stores the full prior state (JSONB) before UPDATE or DELETE.
-- new_value stores the full new state (JSONB) after INSERT or UPDATE.
-- performed_by_role is 'health_staff' | 'system_admin' — denormalized for fast reads.

-- ─── Audit Trigger for Atomicity ──────────────────────────────────────────────
-- Guarantees inventory change + audit log succeed/fail together.

CREATE OR REPLACE FUNCTION audit_inventory_transaction()
RETURNS TRIGGER AS $$
DECLARE
    actor_id UUID;
    actor_role TEXT;
    action_name TEXT;
    prev_val JSONB := NULL;
    new_val JSONB := NULL;
    meta JSONB;
BEGIN
    actor_id := auth.uid();
    
    -- Enforce atomicity and prevent incomplete log entries
    IF actor_id IS NULL THEN
        RAISE EXCEPTION 'Audit log failed: User ID is required';
    END IF;

    -- Try to fetch actor_role
    SELECT role INTO actor_role FROM public.users WHERE id = actor_id;

    IF TG_OP = 'INSERT' THEN
        action_name := 'CREATE inventory item: "' || NEW.generic_name || '"';
        new_val := to_jsonb(NEW);
        meta := jsonb_build_object('item_name', NEW.generic_name, 'quantity', NEW.quantity);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD IS NOT DISTINCT FROM NEW THEN
            RETURN NEW;
        END IF;
        action_name := 'UPDATE inventory item: "' || NEW.generic_name || '"';
        prev_val := to_jsonb(OLD);
        new_val := to_jsonb(NEW);
        meta := jsonb_build_object('item_name', NEW.generic_name);
    ELSIF TG_OP = 'DELETE' THEN
        action_name := 'DELETE inventory item: "' || OLD.generic_name || '"';
        prev_val := to_jsonb(OLD);
        meta := jsonb_build_object('item_name', OLD.generic_name);
    END IF;

    -- Insert safely without swallowing error to guarantee atomicity
    INSERT INTO public.admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        metadata,
        old_value,
        new_value,
        performed_by_role
    ) VALUES (
        actor_id,
        action_name,
        'inventory',
        COALESCE(NEW.item_id, OLD.item_id)::text,
        meta,
        prev_val,
        new_val,
        actor_role
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS inventory_audit_trigger ON public.inventory;
CREATE TRIGGER inventory_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION audit_inventory_transaction();
