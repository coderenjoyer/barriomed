-- ─── feature_toggles table ───────────────────────────────────────────────────
-- Stores the enabled/disabled state for system features.
-- One row per feature. States must persist and be consistent across clients.
-- Only system_admins can write; all authenticated users can read.

CREATE TABLE IF NOT EXISTS public.feature_toggles (
    feature         TEXT PRIMARY KEY,           -- 'login' | 'chat' | 'queue'
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default rows (all enabled) — idempotent
INSERT INTO public.feature_toggles (feature, is_enabled)
VALUES
    ('login', TRUE),
    ('chat',  TRUE),
    ('queue', TRUE)
ON CONFLICT (feature) DO NOTHING;

-- Index for lookups
CREATE INDEX IF NOT EXISTS feature_toggles_feature_idx ON public.feature_toggles(feature);

-- ─── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read toggle states (needed for enforcement checks)
CREATE POLICY "Authenticated users can read feature toggles"
ON public.feature_toggles
FOR SELECT
TO authenticated
USING (TRUE);

-- Only system_admins can update toggle states
CREATE POLICY "Admins can update feature toggles"
ON public.feature_toggles
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'system_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'system_admin'
    )
);

-- Prevent inserts/deletes from the client (managed by migration only)
-- (no INSERT/DELETE policies = blocked by RLS)

-- ─── Enable Realtime ─────────────────────────────────────────────────────────
-- This ensures all clients get push updates the moment a toggle changes.

ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_toggles;
