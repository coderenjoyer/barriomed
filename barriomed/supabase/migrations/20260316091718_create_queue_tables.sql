-- Create enums for queue transaction status and source
CREATE TYPE public.queue_status AS ENUM ('Pending', 'Waiting', 'Serving', 'Completed', 'No Show');
CREATE TYPE public.queue_source AS ENUM ('app', 'walk_in');

-- Table: Queue_Transactions
CREATE TABLE IF NOT EXISTS public.queue_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    queue_number INT NOT NULL,
    service_type VARCHAR NOT NULL,
    source public.queue_source NOT NULL DEFAULT 'app',
    status public.queue_status NOT NULL DEFAULT 'Pending',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: Queue_State
CREATE TABLE IF NOT EXISTS public.queue_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    currently_serving INT NOT NULL DEFAULT 0,
    last_called_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce one active state row per service type per day
    UNIQUE(service_type, date)
);

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Queue_Transactions
CREATE TRIGGER update_queue_transactions_updated_at
BEFORE UPDATE ON public.queue_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for Queue_State
CREATE TRIGGER update_queue_state_updated_at
BEFORE UPDATE ON public.queue_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.queue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_state ENABLE ROW LEVEL SECURITY;

-- Policies for Queue_Transactions
-- Users can view their own transactions
CREATE POLICY "Users can view own queue transactions"
ON public.queue_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert own queue transactions"
ON public.queue_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions (e.g. status changes if allowed)
CREATE POLICY "Users can update own queue transactions"
ON public.queue_transactions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Staff/Admin can view all transactions (assuming a role-based access control, checking a claim or another table)
-- Example: 
-- CREATE POLICY "Staff can view all queue transactions"
-- ON public.queue_transactions FOR SELECT
-- TO authenticated
-- USING ( (select auth.jwt()->>'role') in ('staff', 'admin') );

-- Policies for Queue_State
-- Everyone authenticated can view the queue state
CREATE POLICY "Anyone authenticated can view queue state"
ON public.queue_state FOR SELECT
TO authenticated
USING (true);

-- realtime schema
alter publication supabase_realtime add table public.queue_transactions;
alter publication supabase_realtime add table public.queue_state;
