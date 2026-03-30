-- ─── admin_logs table ──────────────────────────────────────────────────────
-- Tracks every admin action for auditing and traceability.
-- This table is append-only. No deletes allowed.

CREATE TABLE IF NOT EXISTS public.admin_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,
    resource_type   TEXT NOT NULL,       -- e.g. 'users', 'inventory', 'queue_transactions'
    resource_id     TEXT,                -- The affected record's ID (nullable)
    metadata        JSONB,               -- Arbitrary context (new values, counts, etc.)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by admin or resource type
CREATE INDEX IF NOT EXISTS admin_logs_admin_id_idx ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS admin_logs_resource_type_idx ON public.admin_logs(resource_type);
CREATE INDEX IF NOT EXISTS admin_logs_created_at_idx ON public.admin_logs(created_at DESC);

-- ─── Row-Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only system_admins can INSERT log entries
CREATE POLICY "Admins can insert logs"
ON public.admin_logs
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'system_admin'
    )
);

-- Only system_admins can SELECT log entries
CREATE POLICY "Admins can read logs"
ON public.admin_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'system_admin'
    )
);

-- Nobody can UPDATE or DELETE logs (append-only)
-- (no UPDATE/DELETE policies = those operations are blocked by RLS)

-- ─── Enable Realtime ────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_logs;
