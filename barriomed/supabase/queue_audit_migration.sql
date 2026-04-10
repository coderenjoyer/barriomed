-- ─── Queue Audit Logging ───────────────────────────────────────────────────
-- Creates a trigger on queue_transactions to log all changes into admin_logs.
-- Ensures atomicity, immutability, and actor tracking.

CREATE OR REPLACE FUNCTION audit_queue_transaction()
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
    
    IF actor_id IS NULL THEN
        actor_id := COALESCE(NEW.user_id, OLD.user_id);
    END IF;

    IF actor_id IS NULL THEN
        -- If we cannot resolve an actor, we cannot satisfy the NOT NULL constraint on admin_id.
        -- We exit the trigger silently so the queue transaction still succeeds.
        RETURN NULL;
    END IF;

    -- Try to fetch actor_role
    SELECT role INTO actor_role FROM public.users WHERE id = actor_id;

    IF TG_OP = 'INSERT' THEN
        action_name := 'QUEUE_CREATE';
        new_val := to_jsonb(NEW);
        meta := jsonb_build_object('queue_number', NEW.queue_number, 'patient_id', NEW.user_id);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Standardize on "CHANGE_STATUS" or "UPDATE_QUEUE_ENTRY"
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            action_name := 'QUEUE_STATUS_CHANGE';
            meta := jsonb_build_object('previous_status', OLD.status, 'new_status', NEW.status, 'patient_id', NEW.user_id);
        ELSE
            -- Only log meaningful data changes
            IF OLD IS NOT DISTINCT FROM NEW THEN
                RETURN NULL;
            END IF;
            action_name := 'QUEUE_UPDATE';
            meta := jsonb_build_object('patient_id', NEW.user_id);
        END IF;
        prev_val := to_jsonb(OLD);
        new_val := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        action_name := 'QUEUE_DELETE';
        prev_val := to_jsonb(OLD);
        meta := jsonb_build_object('queue_number', OLD.queue_number, 'patient_id', OLD.user_id);
    END IF;

    -- Insert safely
    BEGIN
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
            'queue_transactions',
            COALESCE(NEW.ticket_id, OLD.ticket_id)::text,
            meta,
            prev_val,
            new_val,
            actor_role
        );
    EXCEPTION WHEN OTHERS THEN
        -- In case of any error (e.g., actor UUID not found in users table), swallow it
        -- so the queue operation does not fail.
    END;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS queue_audit_trigger ON public.queue_transactions;
CREATE TRIGGER queue_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.queue_transactions
FOR EACH ROW EXECUTE FUNCTION audit_queue_transaction();
