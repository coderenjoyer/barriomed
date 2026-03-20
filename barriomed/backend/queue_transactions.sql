-- =================================================================================
-- VIRTUAL QUEUING MODULE ("Kuha Number") - SUPABASE PG SCHEMA
-- =================================================================================

-- 0. Clean slate existing objects to prevent column mismatch errors on deploy
DROP TABLE IF EXISTS public.queue_transactions CASCADE;
DROP TYPE IF EXISTS public.service_type_enum CASCADE;
DROP TYPE IF EXISTS public.queue_status_enum CASCADE;

-- 1. Create ENUM types for the queue system
CREATE TYPE public.service_type_enum AS ENUM (
    'General', 
    'Prenatal', 
    'Dental', 
    'Vaccination'
);

CREATE TYPE public.queue_status_enum AS ENUM (
    'PENDING_SYNC', 
    'WAITING',      
    'SERVING',      
    'COMPLETED',    
    'SKIPPED',      
    'CANCELLED'     
);


-- 2. Create the Queue_Transactions table
-- Note: Local SQLite schemas will also have `sync_flag BOOLEAN` which is strictly local data.
CREATE TABLE IF NOT EXISTS public.queue_transactions (
    ticket_id UUID PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    service_type public.service_type_enum NOT NULL,
    queue_number INTEGER, 
    status public.queue_status_enum NOT NULL DEFAULT 'PENDING_SYNC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    called_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);


-- 3. Create Clinic Settings Table (For Service Cut-offs / Capacity)
CREATE TABLE IF NOT EXISTS public.clinic_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default daily max capacity
INSERT INTO public.clinic_settings (setting_key, setting_value)
VALUES ('daily_queue_capacity', '{"max_patients": 100}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;


-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.queue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

-- Creating indexes for performance
-- Index for querying waiting/serving tickets sequentially
CREATE INDEX IF NOT EXISTS idx_vqm_status_queue_number 
ON public.queue_transactions(status, queue_number ASC);

-- Index for real-time subscription filtering
CREATE INDEX IF NOT EXISTS idx_vqm_status 
ON public.queue_transactions(status);

-- Index for daily resets and queue numbering (PHT Midnight Reset)
CREATE INDEX IF NOT EXISTS idx_vqm_created_at_date 
ON public.queue_transactions((timezone('Asia/Manila', created_at)::date));

-- Index for user past and present queue lookup
CREATE INDEX IF NOT EXISTS idx_vqm_user_id 
ON public.queue_transactions(user_id);


-- 5. RLS Policies

-- Policy: Users can view their own queue tickets
DROP POLICY IF EXISTS "Users can view their own queue tickets" ON public.queue_transactions;
CREATE POLICY "Users can view their own queue tickets"
ON public.queue_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own queue tickets (if hitting Supabase API directly)
DROP POLICY IF EXISTS "Users can insert their own queue tickets" ON public.queue_transactions;
CREATE POLICY "Users can insert their own queue tickets"
ON public.queue_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can cancel their own waiting tickets
DROP POLICY IF EXISTS "Users can cancel their own waiting tickets" ON public.queue_transactions;
CREATE POLICY "Users can cancel their own waiting tickets"
ON public.queue_transactions FOR UPDATE
USING (auth.uid() = user_id AND status = 'WAITING')
WITH CHECK (status = 'CANCELLED');

-- Policy: Authenticated users can view the active line (to calculate EWT or position)
DROP POLICY IF EXISTS "Authenticated users can view the active line" ON public.queue_transactions;
CREATE POLICY "Authenticated users can view the active line"
ON public.queue_transactions FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Public read for Clinic Settings (needed for App UI to show "Queue Closed")
DROP POLICY IF EXISTS "Anyone can view clinic settings" ON public.clinic_settings;
CREATE POLICY "Anyone can view clinic settings"
ON public.clinic_settings FOR SELECT
USING (true);


-- 6. RPC Functions

-- Algorithm 1: Optimistic Queue Assignment & Double Sync Check
-- Intended for Edge Function or Client Direct Call to assign the next queue number safely.
DROP FUNCTION IF EXISTS public.assign_queue_number(UUID, UUID, public.service_type_enum, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.assign_queue_number(
    p_ticket_id UUID, 
    p_user_id UUID, 
    p_service_type public.service_type_enum, 
    p_created_at TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
    ticket_id UUID,
    queue_number INTEGER,
    status public.queue_status_enum
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Elevated privileges to evaluate capacity and find MAX queue number
AS $$
DECLARE
    v_day_start TIMESTAMPTZ;
    v_day_end TIMESTAMPTZ;
    v_next_number INTEGER;
    v_existing_status public.queue_status_enum;
    v_assigned_number INTEGER;
    v_current_count INTEGER;
    v_max_capacity INTEGER;
BEGIN
    -- Determine current PHT midnight bounds using accurate timestamptz
    v_day_start := (timezone('Asia/Manila', p_created_at)::date)::timestamp AT TIME ZONE 'Asia/Manila';
    v_day_end := v_day_start + interval '1 day';

    -- Idempotency Check (Handling the "Double Sync" Issue)
    SELECT q.queue_number, q.status 
    INTO v_assigned_number, v_existing_status
    FROM public.queue_transactions q
    WHERE q.ticket_id = p_ticket_id;

    IF FOUND THEN
        -- If already processed, return existing values (ignore second creation attempt)
        RETURN QUERY SELECT p_ticket_id, v_assigned_number, v_existing_status;
        RETURN;
    END IF;

    -- Capacity Check (Service Cut-offs)
    SELECT (setting_value->>'max_patients')::INTEGER 
    INTO v_max_capacity 
    FROM public.clinic_settings 
    WHERE setting_key = 'daily_queue_capacity';

    SELECT COUNT(*) 
    INTO v_current_count 
    FROM public.queue_transactions q
    WHERE q.created_at >= v_day_start AND q.created_at < v_day_end;

    IF v_current_count >= COALESCE(v_max_capacity, 100) THEN
        RAISE EXCEPTION '403: Queue Closed for Today';
    END IF;

    -- Gapless number logic for the day
    SELECT COALESCE(MAX(q.queue_number), 0) + 1 
    INTO v_next_number
    FROM public.queue_transactions q
    WHERE q.created_at >= v_day_start AND q.created_at < v_day_end;

    -- Insert the official ticket row
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
        p_created_at
    );

    RETURN QUERY SELECT p_ticket_id, v_next_number, 'WAITING'::public.queue_status_enum;
END;
$$;


-- Algorithm 2: The "Queue Commander" Call Next Flow
-- Used by the Web Dashboard to advance the line.
DROP FUNCTION IF EXISTS public.call_next();
DROP FUNCTION IF EXISTS public.call_next(TEXT);
DROP FUNCTION IF EXISTS public.call_next(public.service_type_enum);
CREATE OR REPLACE FUNCTION public.call_next(
    p_service_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    called_ticket_id UUID,
    called_queue_number INTEGER,
    called_service_type public.service_type_enum
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_day_start TIMESTAMPTZ := (timezone('Asia/Manila', v_now)::date)::timestamp AT TIME ZONE 'Asia/Manila';
    v_day_end TIMESTAMPTZ := v_day_start + interval '1 day';
    v_serving_ticket_id UUID;
    v_next_ticket_id UUID;
    v_parsed_service public.service_type_enum := NULL;
BEGIN
    IF p_service_type IS NOT NULL THEN
        v_parsed_service := p_service_type::public.service_type_enum;
    END IF;
    -- Step A: Terminate the currently 'SERVING' ticket today
    -- If p_service_type is provided, limit termination to that service
    UPDATE public.queue_transactions
    SET 
        status = 'COMPLETED',
        completed_at = v_now
    WHERE 
        status = 'SERVING' 
        AND created_at >= v_day_start AND created_at < v_day_end
        AND (v_parsed_service IS NULL OR service_type = v_parsed_service)
    RETURNING ticket_id INTO v_serving_ticket_id;

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

    -- Step C: Upgrade found ticket to 'SERVING'
    IF v_next_ticket_id IS NOT NULL THEN
        UPDATE public.queue_transactions
        SET 
            status = 'SERVING',
            called_at = v_now
        WHERE ticket_id = v_next_ticket_id
        RETURNING ticket_id, queue_number, service_type
        INTO called_ticket_id, called_queue_number, called_service_type;

        RETURN NEXT;
    END IF;

    RETURN;
END;
$$;


-- Algorithm 3: Walk-In Injection
-- Creates a new row bypassing the optimistic offline-first loop
DROP FUNCTION IF EXISTS public.add_walk_in(public.service_type_enum, UUID);
CREATE OR REPLACE FUNCTION public.add_walk_in(
    p_service_type public.service_type_enum,
    p_user_id UUID DEFAULT NULL -- Could be NULL if non-registered walk-in, though schema requires user_id.
                                -- Use a "Guest" account user_id or modify schema if guest is allowed.
                                -- Currently schema assumes user_id NOT NULL.
)
RETURNS TABLE (
    ticket_id UUID,
    queue_number INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_ticket UUID := gen_random_uuid();
    v_assigned_number INTEGER;
    v_status public.queue_status_enum;
BEGIN
    SELECT q.queue_number, q.status 
    INTO v_assigned_number, v_status
    FROM public.assign_queue_number(v_new_ticket, p_user_id, p_service_type, now()) AS q;

    RETURN QUERY SELECT v_new_ticket, v_assigned_number;
END;
$$;
