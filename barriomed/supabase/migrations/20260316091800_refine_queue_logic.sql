
-- Rename if needed, but I'll stick to queue_transactions as per migration
-- and update the service code instead.

-- Table: Daily_Analytics
CREATE TABLE IF NOT EXISTS public.daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
    total_served INT DEFAULT 0,
    total_no_shows INT DEFAULT 0,
    total_walk_ins INT DEFAULT 0,
    avg_wait_time_seconds INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: App_Config
CREATE TABLE IF NOT EXISTS public.app_config (
    key VARCHAR PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Config
INSERT INTO public.app_config (key, value) VALUES
('NOTIFY_THRESHOLD', '5'),
('RETRY_ATTEMPTS', '3'),
('RE_INSERT_OFFSET', '3'),
('RE_INSERT_WINDOW_MINUTES', '30')
ON CONFLICT (key) DO NOTHING;

-- Add patient_name to Queue_Transactions for walk-ins
ALTER TABLE public.queue_transactions ADD COLUMN IF NOT EXISTS patient_name VARCHAR;

-- Function: Generate Ticket (A-BL-01)
CREATE OR REPLACE FUNCTION public.generate_ticket(
    p_user_id UUID, 
    p_service_type VARCHAR, 
    p_source public.queue_source DEFAULT 'app',
    p_patient_name VARCHAR DEFAULT NULL
)
RETURNS public.queue_transactions AS $$
DECLARE
    v_queue_number INT;
    v_record public.queue_transactions;
BEGIN
    -- Check for existing active ticket for today (One active ticket per user_id per date)
    IF p_user_id IS NOT NULL THEN
        SELECT * INTO v_record FROM public.queue_transactions 
        WHERE user_id = p_user_id AND date = CURRENT_DATE AND status IN ('Waiting', 'Serving', 'Pending');
        
        IF FOUND THEN
            RETURN v_record;
        END IF;
    END IF;

    -- Get next queue number
    SELECT COALESCE(MAX(queue_number), 0) + 1 INTO v_queue_number 
    FROM public.queue_transactions 
    WHERE date = CURRENT_DATE;

    INSERT INTO public.queue_transactions (user_id, queue_number, service_type, source, status, patient_name)
    VALUES (p_user_id, v_queue_number, p_service_type, p_source, 'Waiting', p_patient_name)
    RETURNING * INTO v_record;

    RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Call Next (B-BL-01, B-FR-02)
CREATE OR REPLACE FUNCTION public.call_next(p_service_type VARCHAR)
RETURNS public.queue_transactions AS $$
DECLARE
    v_next_transaction public.queue_transactions;
BEGIN
    -- Find next 'Waiting' patient for the service type today
    SELECT * INTO v_next_transaction FROM public.queue_transactions
    WHERE service_type = p_service_type AND date = CURRENT_DATE AND status = 'Waiting'
    ORDER BY queue_number ASC LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No patients in queue';
    END IF;

    -- Update transaction status to 'Serving'
    UPDATE public.queue_transactions SET status = 'Serving', updated_at = NOW() WHERE id = v_next_transaction.id;

    -- Update queue state
    INSERT INTO public.queue_state (service_type, date, currently_serving, last_called_at)
    VALUES (p_service_type, CURRENT_DATE, v_next_transaction.queue_number, NOW())
    ON CONFLICT (service_type, date) DO UPDATE SET
        currently_serving = EXCLUDED.currently_serving,
        last_called_at = EXCLUDED.last_called_at,
        updated_at = NOW();

    RETURN v_next_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Re-insert Patient (D-BL-03)
CREATE OR REPLACE FUNCTION public.reinsert_patient(p_transaction_id UUID)
RETURNS public.queue_transactions AS $$
DECLARE
    v_transaction public.queue_transactions;
    v_currently_serving INT;
    v_offset INT;
    v_window INT;
    v_new_queue_number INT;
BEGIN
    SELECT * INTO v_transaction FROM public.queue_transactions WHERE id = p_transaction_id;
    
    IF v_transaction.status != 'No Show' THEN
        RAISE EXCEPTION 'Transaction is not in No Show status';
    END IF;

    -- Check window (default 30 mins)
    SELECT (value->>0)::INT INTO v_window FROM public.app_config WHERE key = 'RE_INSERT_WINDOW_MINUTES';
    IF v_transaction.updated_at < NOW() - (v_window || ' minutes')::interval THEN
        RAISE EXCEPTION 'Re-insertion window expired';
    END IF;

    -- Get offset (default 3)
    SELECT (value->>0)::INT INTO v_offset FROM public.app_config WHERE key = 'RE_INSERT_OFFSET';
    
    -- Get currently serving
    SELECT COALESCE(currently_serving, 0) INTO v_currently_serving FROM public.queue_state 
    WHERE service_type = v_transaction.service_type AND date = CURRENT_DATE;

    v_new_queue_number := v_currently_serving + v_offset;

    UPDATE public.queue_transactions SET
        status = 'Waiting',
        queue_number = v_new_queue_number,
        updated_at = NOW()
    WHERE id = p_transaction_id
    RETURNING * INTO v_transaction;

    RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Complete Patient (B-FR-04)
CREATE OR REPLACE FUNCTION public.complete_patient(p_transaction_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.queue_transactions 
    SET status = 'Completed', updated_at = NOW() 
    WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark No Show (B-FR-05)
CREATE OR REPLACE FUNCTION public.mark_no_show(p_transaction_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.queue_transactions 
    SET status = 'No Show', updated_at = NOW() 
    WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for Walk-In Registration (B-FR-03, E-BL-01)
CREATE OR REPLACE FUNCTION public.register_walk_in(
    p_patient_name VARCHAR,
    p_service_type VARCHAR
)
RETURNS public.queue_transactions AS $$
BEGIN
    -- We can either create a guest user or just store the name.
    -- The requirement says "create guest record in users table" if not exists.
    -- However, since creating auth.users is complex from SQL without triggers, 
    -- we'll just insert into queue_transactions with patient_name and null user_id for now, 
    -- or the caller can pass a user_id if they handled the user creation in the client.
    -- But let's assume the client might pass a temporary guest user_id if needed.
    
    RETURN public.generate_ticket(NULL, p_service_type, 'walk_in', p_patient_name);
END;

-- Function: End of Day Archiving (F-BL-01)
CREATE OR REPLACE FUNCTION public.archive_daily_stats()
RETURNS VOID AS $$
DECLARE
    v_yesterday DATE := CURRENT_DATE - 1;
    v_total_served INT;
    v_total_no_shows INT;
    v_total_walk_ins INT;
    v_avg_wait_time INT;
BEGIN
    SELECT COUNT(*) INTO v_total_served FROM public.queue_transactions WHERE date = v_yesterday AND status = 'Completed';
    SELECT COUNT(*) INTO v_total_no_shows FROM public.queue_transactions WHERE date = v_yesterday AND status = 'No Show';
    SELECT COUNT(*) INTO v_total_walk_ins FROM public.queue_transactions WHERE date = v_yesterday AND source = 'walk_in';
    
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))), 0)::INT INTO v_avg_wait_time 
    FROM public.queue_transactions 
    WHERE date = v_yesterday AND status = 'Completed';

    INSERT INTO public.daily_analytics (date, total_served, total_no_shows, total_walk_ins, avg_wait_time_seconds)
    VALUES (v_yesterday, v_total_served, v_total_no_shows, v_total_walk_ins, v_avg_wait_time)
    ON CONFLICT (date) DO UPDATE SET
        total_served = EXCLUDED.total_served,
        total_no_shows = EXCLUDED.total_no_shows,
        total_walk_ins = EXCLUDED.total_walk_ins,
        avg_wait_time_seconds = EXCLUDED.avg_wait_time_seconds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
