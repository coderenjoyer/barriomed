-- ════════════════════════════════════════════════════════════════════
-- Doctor-Patient Chat Module − Supabase Migration
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New Query)
-- ════════════════════════════════════════════════════════════════════

-- ─── 1. Doctor Availability ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_availability (
    doctor_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_available        BOOLEAN     NOT NULL DEFAULT FALSE,
    working_hours_start TEXT        NOT NULL DEFAULT '08:00',   -- 'HH:MM' 24-hr
    working_hours_end   TEXT        NOT NULL DEFAULT '17:00',   -- 'HH:MM' 24-hr
    timezone            TEXT        NOT NULL DEFAULT 'Asia/Manila',
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;

-- Doctors own their own row
CREATE POLICY "doctor_availability_select_all" ON doctor_availability
    FOR SELECT USING (true);   -- patients need to read doctor status

CREATE POLICY "doctor_availability_insert_own" ON doctor_availability
    FOR INSERT WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "doctor_availability_update_own" ON doctor_availability
    FOR UPDATE USING (auth.uid() = doctor_id);

-- ─── 2. Conversations ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (doctor_id, patient_id)
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_conversations_doctor ON conversations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_patient ON conversations(patient_id);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Only doctor or patient in the conversation can read it
CREATE POLICY "conversations_select" ON conversations
    FOR SELECT USING (
        auth.uid() = doctor_id OR auth.uid() = patient_id
    );

-- Both patients AND doctors can create conversations
-- (patient initiates from "Find a Doctor", doctor initiates from "Find Patient")
CREATE POLICY "conversations_insert" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = patient_id OR auth.uid() = doctor_id
    );

-- Doctors can also update last_message_at on their conversations
CREATE POLICY "conversations_update_own" ON conversations
    FOR UPDATE USING (
        auth.uid() = doctor_id OR auth.uid() = patient_id
    );

-- ─── 3. Chat Messages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT        NOT NULL CHECK (char_length(content) > 0),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_read         BOOLEAN     NOT NULL DEFAULT FALSE
);

-- Index for ordered retrieval per conversation
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, timestamp ASC);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Only sender or receiver can read messages
CREATE POLICY "chat_messages_select" ON chat_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- Only the sender OR receiver can insert (receiver check handled by app logic)
CREATE POLICY "chat_messages_insert" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Only receiver can mark as read
CREATE POLICY "chat_messages_update_read" ON chat_messages
    FOR UPDATE USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- ─── 4. Enable Realtime ───────────────────────────────────────────────────────
-- In Supabase dashboard → Database → Replication, enable replication for:
--   • doctor_availability
--   • conversations
--   • chat_messages
-- Or run the following to add them to the realtime publication:

ALTER PUBLICATION supabase_realtime ADD TABLE doctor_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- ─── PATCH: If you already ran the original migration ─────────────────────────
-- Run this block to update the conversations insert policy so doctors can also
-- initiate conversations from the "Find Patient" feature:
--
-- DROP POLICY IF EXISTS "conversations_insert_patient" ON conversations;
-- CREATE POLICY "conversations_insert" ON conversations
--     FOR INSERT WITH CHECK (
--         auth.uid() = patient_id OR auth.uid() = doctor_id
--     );
-- CREATE POLICY "conversations_update_own" ON conversations
--     FOR UPDATE USING (
--         auth.uid() = doctor_id OR auth.uid() = patient_id
--     );
