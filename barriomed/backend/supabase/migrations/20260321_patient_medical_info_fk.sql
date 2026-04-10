-- ============================================================
-- Migration: Add direct FK from patient_medical_info to public.users
-- Date: 2026-03-21
--
-- medicalinfo.sql created patient_medical_info.user_id referencing
-- auth.users(id), but PostgREST cannot auto-resolve a join between
-- public.users and patient_medical_info through auth.users.
--
-- This migration adds a DIRECT foreign key:
--   patient_medical_info.user_id → public.users.id
-- so that PostgREST can embed patient_medical_info rows inside a
-- query on public.users using the standard embed syntax.
-- ============================================================

-- Add the direct FK (if it doesn't already exist)
DO $$ BEGIN
    ALTER TABLE public.patient_medical_info
        ADD CONSTRAINT fk_pmi_public_user
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN
        -- FK may already exist under a different name — silently skip
        NULL;
END $$;

-- Also ensure there's an index on user_id for the join performance
CREATE INDEX IF NOT EXISTS idx_pmi_user_id_public
    ON public.patient_medical_info(user_id);
