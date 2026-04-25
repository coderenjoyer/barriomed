-- ─── auth_logs table ──────────────────────────────────────────────────────
-- Tracks login attempts (e.g., blocked due to deactivation).

CREATE TABLE IF NOT EXISTS public.auth_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id      UUID REFERENCES public.users(id) ON DELETE CASCADE,
    attempt_status  TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by patient
CREATE INDEX IF NOT EXISTS auth_logs_patient_id_idx ON public.auth_logs(patient_id);
CREATE INDEX IF NOT EXISTS auth_logs_created_at_idx ON public.auth_logs(created_at DESC);

-- ─── Row-Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.auth_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own logs (before we sign them out locally)
CREATE POLICY "Users can insert their own auth logs"
ON public.auth_logs
FOR INSERT
TO authenticated
WITH CHECK ( auth.uid() = patient_id );

-- Only admins can read the logs
CREATE POLICY "Admins can read auth logs"
ON public.auth_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'system_admin'
    )
);

-- ─── Enable Realtime ────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_logs;
