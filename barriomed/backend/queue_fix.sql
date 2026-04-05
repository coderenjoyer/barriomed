-- =================================================================================
-- QUEUE FIX PATCH - Apply to Supabase SQL Editor
-- Fixes: duplicate queue numbers, race conditions, ghost WAITING rows on cancel
-- =================================================================================

-- ---------------------------------------------------------------------------------
-- 1. Unique Partial Index (Hard DB Safety Net)
--    Prevents any two rows from sharing the same queue_number on the same calendar
--    day (PHT). Even if the RPC races, the DB will reject the second insert with
--    a unique violation rather than silently storing a duplicate.
-- ---------------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_vqm_unique_queue_number_per_day;
CREATE UNIQUE INDEX idx_vqm_unique_queue_number_per_day
ON public.queue_transactions (
    queue_number,
    (timezone('Asia/Manila', created_at)::date)
);


-- ---------------------------------------------------------------------------------
-- 2. Rewrite assign_queue_number with Advisory Lock (Race Condition Fix)
--
--    pg_advisory_xact_lock(key) acquires a session-level exclusive lock on an
--    integer key for the duration of the transaction. All concurrent callers
--    serialise on this lock, so MAX(queue_number)+1 is always computed on a
--    fully-committed state — no two callers can observe the same MAX.
--
--    The lock is automatically released when the transaction commits/rolls back,
--    so there is no cleanup burden.
-- ---------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.assign_queue_number(UUID, UUID, public.service_type_enum, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.assign_queue_number(
    p_ticket_id UUID,
    p_user_id   UUID,
    p_service_type public.service_type_enum,
    p_created_at   TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
    ticket_id    UUID,
    queue_number INTEGER,
    status       public.queue_status_enum
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_day_start        TIMESTAMPTZ;
    v_day_end          TIMESTAMPTZ;
    v_next_number      INTEGER;
    v_existing_status  public.queue_status_enum;
    v_assigned_number  INTEGER;
    v_current_count    INTEGER;
    v_max_capacity     INTEGER;
    -- Stable advisory lock key: hash of the literal string 'queue_number_assign'
    -- Using hashtext gives a consistent bigint from a string. We only need the first
    -- 32 bits for pg_advisory_xact_lock(int4), which accepts a single int.
    v_lock_key         INTEGER := hashtext('queue_number_assign');
BEGIN
    -- Acquire exclusive advisory lock for this transaction.
    -- All concurrent calls block here until the previous caller commits.
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Determine current PHT midnight bounds
    v_day_start := (timezone('Asia/Manila', now())::date)::timestamp AT TIME ZONE 'Asia/Manila';
    v_day_end   := v_day_start + interval '1 day';

    -- ── Idempotency Check ──────────────────────────────────────────────────────
    -- If this ticket_id was already processed (double-sync / retry), return it.
    SELECT q.queue_number, q.status
    INTO   v_assigned_number, v_existing_status
    FROM   public.queue_transactions q
    WHERE  q.ticket_id = p_ticket_id;

    IF FOUND THEN
        RETURN QUERY SELECT p_ticket_id, v_assigned_number, v_existing_status;
        RETURN;
    END IF;

    -- ── Capacity Check ────────────────────────────────────────────────────────
    SELECT (setting_value->>'max_patients')::INTEGER
    INTO   v_max_capacity
    FROM   public.clinic_settings
    WHERE  setting_key = 'daily_queue_capacity';

    SELECT COUNT(*)
    INTO   v_current_count
    FROM   public.queue_transactions q
    WHERE  q.created_at >= v_day_start
      AND  q.created_at <  v_day_end
      AND  q.status NOT IN ('CANCELLED');   -- Cancelled slots don't count against capacity

    IF v_current_count >= COALESCE(v_max_capacity, 100) THEN
        RAISE EXCEPTION '403: Queue Closed for Today';
    END IF;

    -- ── Unique Sequential Number (now safe because of the advisory lock) ──────
    SELECT COALESCE(MAX(q.queue_number), 0) + 1
    INTO   v_next_number
    FROM   public.queue_transactions q
    WHERE  q.created_at >= v_day_start
      AND  q.created_at <  v_day_end;

    -- ── Insert ────────────────────────────────────────────────────────────────
    INSERT INTO public.queue_transactions (
        ticket_id,
        user_id,
        service_type,
        queue_number,
        status,
        created_at
    ) VALUES (
        p_ticket_id,
        p_user_id,
        p_service_type,
        v_next_number,
        'WAITING',
        now()           -- Always use server clock, not client-supplied time
    );

    RETURN QUERY SELECT p_ticket_id, v_next_number, 'WAITING'::public.queue_status_enum;
END;
$$;


-- ---------------------------------------------------------------------------------
-- 3. cancel_ticket RPC (Proper DB-Side Cancellation)
--    Client-side "cancel" was only clearing AsyncStorage, leaving WAITING rows
--    in the DB. This function atomically cancels the ticket so queue numbers
--    stay accurate and the slot is reclaimed.
-- ---------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cancel_ticket(UUID, UUID);
CREATE OR REPLACE FUNCTION public.cancel_ticket(
    p_ticket_id UUID,
    p_user_id   UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE public.queue_transactions
    SET    status = 'CANCELLED'
    WHERE  ticket_id = p_ticket_id
      AND  user_id   = p_user_id
      AND  status IN ('WAITING', 'PENDING_SYNC');

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected > 0;
END;
$$;


-- ---------------------------------------------------------------------------------
-- 4. Grant EXECUTE on new functions to authenticated role
-- ---------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.assign_queue_number(UUID, UUID, public.service_type_enum, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_ticket(UUID, UUID) TO authenticated;


-- ---------------------------------------------------------------------------------
-- 5. Verify: show current queue_transactions for debugging
-- ---------------------------------------------------------------------------------
-- SELECT ticket_id, user_id, queue_number, status,
--        timezone('Asia/Manila', created_at)::date AS queue_date
-- FROM   public.queue_transactions
-- ORDER  BY queue_number;
