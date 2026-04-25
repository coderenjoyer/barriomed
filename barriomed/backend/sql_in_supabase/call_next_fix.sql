-- =================================================================================
-- PATCH: call_next — add called_user_id to the return table
-- Run this in the Supabase Dashboard → SQL Editor
-- =================================================================================
-- The original call_next RPC did not return the user_id of the promoted patient,
-- which caused the Twilio SMS alert pathway in queueService.ts (callNext) to
-- silently skip every SMS because calledTicket.user_id was always undefined.
-- =================================================================================

DROP FUNCTION IF EXISTS public.call_next(TEXT);
CREATE OR REPLACE FUNCTION public.call_next(
    p_service_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    called_ticket_id    UUID,
    called_queue_number INTEGER,
    called_service_type public.service_type_enum,
    called_user_id      UUID          -- ← NEW: required by the Twilio SMS alert
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now             TIMESTAMPTZ := now();
    v_day_start       TIMESTAMPTZ := (timezone('Asia/Manila', v_now)::date)::timestamp AT TIME ZONE 'Asia/Manila';
    v_day_end         TIMESTAMPTZ := v_day_start + interval '1 day';
    v_serving_id      UUID;
    v_next_ticket_id  UUID;
    v_parsed_service  public.service_type_enum := NULL;
BEGIN
    IF p_service_type IS NOT NULL THEN
        v_parsed_service := p_service_type::public.service_type_enum;
    END IF;

    -- Step A: Terminate the currently 'SERVING' ticket today
    UPDATE public.queue_transactions
    SET
        status       = 'COMPLETED',
        completed_at = v_now
    WHERE
        status = 'SERVING'
        AND created_at >= v_day_start AND created_at < v_day_end
        AND (v_parsed_service IS NULL OR service_type = v_parsed_service)
    RETURNING ticket_id INTO v_serving_id;

    -- Step B: Locate the next sequential 'WAITING' ticket
    SELECT ticket_id
    INTO v_next_ticket_id
    FROM public.queue_transactions
    WHERE
        status = 'WAITING'
        AND created_at >= v_day_start AND created_at < v_day_end
        AND (v_parsed_service IS NULL OR service_type = v_parsed_service)
    ORDER BY queue_number ASC
    LIMIT 1;

    -- Step C: Upgrade found ticket to 'SERVING' and return its full row
    IF v_next_ticket_id IS NOT NULL THEN
        UPDATE public.queue_transactions
        SET
            status    = 'SERVING',
            called_at = v_now
        WHERE ticket_id = v_next_ticket_id
        RETURNING ticket_id, queue_number, service_type, user_id
        INTO called_ticket_id, called_queue_number, called_service_type, called_user_id;

        RETURN NEXT;
    END IF;

    RETURN;
END;
$$;

-- Re-grant execute permission to authenticated role
GRANT EXECUTE ON FUNCTION public.call_next(TEXT) TO authenticated;
