-- ============================================================
-- Migration: Medical Records, Prescriptions, Consultations
-- Date: 2026-03-21
-- ============================================================

-- ── 1. Medical Records ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medical_records (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id     UUID NOT NULL REFERENCES public.users(id),
    title         TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    diagnosis     TEXT NOT NULL DEFAULT '',
    updated_by    UUID NOT NULL REFERENCES public.users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by patient
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id
    ON public.medical_records(patient_id);

-- ── 2. Prescriptions ─────────────────────────────────────────
-- medications is stored as a JSON array of { name, dosage, frequency, duration }
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id    UUID NOT NULL REFERENCES public.users(id),
    medications  JSONB NOT NULL DEFAULT '[]'::jsonb,
    instructions TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id
    ON public.prescriptions(patient_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id
    ON public.prescriptions(doctor_id);

-- ── 3. Consultations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consultations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id       UUID NOT NULL REFERENCES public.users(id),
    notes           TEXT NOT NULL DEFAULT '',
    diagnosis       TEXT NOT NULL DEFAULT '',
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultations_patient_id
    ON public.consultations(patient_id);

CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id
    ON public.consultations(doctor_id);

-- ============================================================
-- Role helper functions
-- IMPORTANT: Must use SECURITY INVOKER (the default) so that
-- auth.uid() resolves to the calling user's JWT, not the
-- function owner's session. SECURITY DEFINER would switch the
-- execution context to 'postgres' and break auth.uid() in RLS.
-- ============================================================

DROP FUNCTION IF EXISTS public.is_doctor() CASCADE;
DROP FUNCTION IF EXISTS public.is_patient() CASCADE;


CREATE OR REPLACE FUNCTION public.is_doctor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
-- SECURITY INVOKER is the default – calling user's JWT is preserved
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id   = auth.uid()
          AND role = 'doctor'::user_role
    );
$$;

CREATE OR REPLACE FUNCTION public.is_patient()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id   = auth.uid()
          AND role = 'patient'::user_role
    );
$$;

-- ============================================================
-- Row-Level Security (RLS)
-- ============================================================

-- ── Medical Records ──────────────────────────────────────────
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can manage medical records"       ON public.medical_records;
DROP POLICY IF EXISTS "Doctors can delete medical records"       ON public.medical_records;
DROP POLICY IF EXISTS "Patients can view their own medical records" ON public.medical_records;

-- Doctors: SELECT / INSERT / UPDATE (FOR ALL covers these)
CREATE POLICY "Doctors can manage medical records"
    ON public.medical_records
    FOR ALL
    TO authenticated
    USING      ( public.is_doctor() )
    WITH CHECK ( public.is_doctor() );

-- Doctors: explicit DELETE policy (belt-and-suspenders alongside FOR ALL)
CREATE POLICY "Doctors can delete medical records"
    ON public.medical_records
    FOR DELETE
    TO authenticated
    USING ( public.is_doctor() );

-- Patients: read-only, own rows only
CREATE POLICY "Patients can view their own medical records"
    ON public.medical_records
    FOR SELECT
    TO authenticated
    USING (
        patient_id = auth.uid()
        AND public.is_patient()
    );

-- ── Prescriptions ─────────────────────────────────────────────
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can manage prescriptions"         ON public.prescriptions;
DROP POLICY IF EXISTS "Doctors can delete prescriptions"         ON public.prescriptions;
DROP POLICY IF EXISTS "Patients can view their own prescriptions" ON public.prescriptions;

CREATE POLICY "Doctors can manage prescriptions"
    ON public.prescriptions
    FOR ALL
    TO authenticated
    USING      ( public.is_doctor() )
    WITH CHECK ( public.is_doctor() );

CREATE POLICY "Doctors can delete prescriptions"
    ON public.prescriptions
    FOR DELETE
    TO authenticated
    USING ( public.is_doctor() );

CREATE POLICY "Patients can view their own prescriptions"
    ON public.prescriptions
    FOR SELECT
    TO authenticated
    USING (
        patient_id = auth.uid()
        AND public.is_patient()
    );

-- ── Consultations ─────────────────────────────────────────────
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can manage consultations"         ON public.consultations;
DROP POLICY IF EXISTS "Doctors can delete consultations"         ON public.consultations;
DROP POLICY IF EXISTS "Patients can view their own consultations" ON public.consultations;

CREATE POLICY "Doctors can manage consultations"
    ON public.consultations
    FOR ALL
    TO authenticated
    USING      ( public.is_doctor() )
    WITH CHECK ( public.is_doctor() );

-- Patients: read-only, own rows only
CREATE POLICY "Patients can view their own consultations"
    ON public.consultations
    FOR SELECT
    TO authenticated
    USING (
        patient_id = auth.uid()
        AND public.is_patient()
    );
