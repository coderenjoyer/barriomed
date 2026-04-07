-- ============================================================================
-- BarrioMed: Doctor CRUD RLS Policies
-- Enables doctors to fully manage medical_records, prescriptions, and
-- consultations they created (identified by doctor_id = auth.uid()).
--
-- Run this in the Supabase Dashboard → SQL Editor.
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ─── Helper: role check ──────────────────────────────────────────────────────
-- We use a sub-select on public.users to validate the caller's role.
-- This avoids JWT claim drift and is always authoritative.

-- ─── medical_records ─────────────────────────────────────────────────────────

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Drop old policies (idempotent)
DROP POLICY IF EXISTS "Doctors can read medical records"      ON medical_records;
DROP POLICY IF EXISTS "Doctors can insert medical records"    ON medical_records;
DROP POLICY IF EXISTS "Doctors can update medical records"    ON medical_records;
DROP POLICY IF EXISTS "Doctors can delete medical records"    ON medical_records;
DROP POLICY IF EXISTS "Patients can read own medical records" ON medical_records;

-- Doctors can read all medical records
CREATE POLICY "Doctors can read medical records"
    ON medical_records FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    );

-- Patients can read only their own records
CREATE POLICY "Patients can read own medical records"
    ON medical_records FOR SELECT
    TO authenticated
    USING (patient_id = auth.uid());

-- Doctors can create records (doctor_id must match authenticated user)
CREATE POLICY "Doctors can insert medical records"
    ON medical_records FOR INSERT
    TO authenticated
    WITH CHECK (
        doctor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    );

-- Doctors can update records they created
CREATE POLICY "Doctors can update medical records"
    ON medical_records FOR UPDATE
    TO authenticated
    USING (
        doctor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    )
    WITH CHECK (
        doctor_id = auth.uid()
    );

-- Doctors can delete records they created
CREATE POLICY "Doctors can delete medical records"
    ON medical_records FOR DELETE
    TO authenticated
    USING (
        doctor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    );

-- ─── prescriptions ───────────────────────────────────────────────────────────

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can read prescriptions"      ON prescriptions;
DROP POLICY IF EXISTS "Doctors can insert prescriptions"    ON prescriptions;
DROP POLICY IF EXISTS "Doctors can update prescriptions"    ON prescriptions;
DROP POLICY IF EXISTS "Doctors can delete prescriptions"    ON prescriptions;
DROP POLICY IF EXISTS "Patients can read own prescriptions" ON prescriptions;

-- Doctors can read all prescriptions
CREATE POLICY "Doctors can read prescriptions"
    ON prescriptions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    );

-- Patients can read only their own prescriptions
CREATE POLICY "Patients can read own prescriptions"
    ON prescriptions FOR SELECT
    TO authenticated
    USING (patient_id = auth.uid());

-- Doctors can create prescriptions (doctor_id must match authenticated user)
CREATE POLICY "Doctors can insert prescriptions"
    ON prescriptions FOR INSERT
    TO authenticated
    WITH CHECK (
        doctor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    );

-- Doctors can update prescriptions they created
CREATE POLICY "Doctors can update prescriptions"
    ON prescriptions FOR UPDATE
    TO authenticated
    USING (
        doctor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    )
    WITH CHECK (doctor_id = auth.uid());

-- Doctors can delete prescriptions they created
CREATE POLICY "Doctors can delete prescriptions"
    ON prescriptions FOR DELETE
    TO authenticated
    USING (
        doctor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    );

-- ─── consultations ───────────────────────────────────────────────────────────

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Doctors can read consultations"      ON consultations;
DROP POLICY IF EXISTS "Doctors can insert consultations"    ON consultations;
DROP POLICY IF EXISTS "Doctors can update consultations"    ON consultations;
DROP POLICY IF EXISTS "Doctors can delete consultations"    ON consultations;
DROP POLICY IF EXISTS "Patients can read own consultations" ON consultations;

-- Doctors can read all consultations
CREATE POLICY "Doctors can read consultations"
    ON consultations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    );

-- Patients can read only their own consultations
CREATE POLICY "Patients can read own consultations"
    ON consultations FOR SELECT
    TO authenticated
    USING (patient_id = auth.uid());

-- Doctors can create consultations
CREATE POLICY "Doctors can insert consultations"
    ON consultations FOR INSERT
    TO authenticated
    WITH CHECK (
        doctor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    );

-- Doctors can update consultations they created
CREATE POLICY "Doctors can update consultations"
    ON consultations FOR UPDATE
    TO authenticated
    USING (
        doctor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    )
    WITH CHECK (doctor_id = auth.uid());

-- Doctors can delete consultations they created
CREATE POLICY "Doctors can delete consultations"
    ON consultations FOR DELETE
    TO authenticated
    USING (
        doctor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
              AND role IN ('doctor', 'health_staff', 'system_admin')
        )
    );
