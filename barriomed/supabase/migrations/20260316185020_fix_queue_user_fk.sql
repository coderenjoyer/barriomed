-- ============================================================================
-- BarrioMed: Fix Foreign Key Relationship for queue_transactions
-- Fixes PGRST200 by creating a direct FK from queue_transactions to public.users
-- ============================================================================

-- Add a foreign key constraint linking queue_transactions to the public.users table.
-- This allows PostgREST to automatically resolve joins like:
-- supabase.from('queue_transactions').select('*, users(first_name, last_name)')

-- Cleanup orphaned queue transactions
DELETE FROM public.queue_transactions
WHERE user_id NOT IN (SELECT id FROM public.users);

ALTER TABLE public.queue_transactions
ADD CONSTRAINT queue_transactions_user_id_fkey_public_users
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Cleanup orphaned patient medical info
DELETE FROM public.patient_medical_info
WHERE user_id NOT IN (SELECT id FROM public.users);

-- Also linking patient_medical_info to public.users just in case
ALTER TABLE public.patient_medical_info
ADD CONSTRAINT patient_medical_info_user_id_fkey_public_users
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
