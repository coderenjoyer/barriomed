-- ════════════════════════════════════════════════════════════════════
-- Notification System − Supabase Migration
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New Query)
-- ════════════════════════════════════════════════════════════════════

-- ─── 1. Notifications Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title           TEXT        NOT NULL,
    message         TEXT        NOT NULL,
    type            TEXT        NOT NULL CHECK (type IN ('chat', 'prescription', 'queue', 'record')),
    is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
    related_id      TEXT        NULL,  -- FK to related entity (conversation_id, prescription_id, etc.)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user unread queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ─── 2. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Authenticated users can insert notifications for any user
-- (server-side triggers / service functions will insert on behalf of target user)
CREATE POLICY "notifications_insert" ON notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can only update (mark read) their own notifications
CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- ─── 3. Device Push Tokens Table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS device_push_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token       TEXT        NOT NULL,
    platform    TEXT        NOT NULL DEFAULT 'android',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, token)
);

ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_select_own" ON device_push_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_insert_own" ON device_push_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_update_own" ON device_push_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete_own" ON device_push_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- ─── 4. Enable Realtime ───────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
