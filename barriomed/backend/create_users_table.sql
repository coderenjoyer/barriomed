-- ============================================================================
-- BarrioMed: Users Profile Table (linked to Supabase Auth)
-- Run this SQL in the Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Create custom enum for user roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'health_staff', 'system_admin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create the users profile table
--    The 'id' column references the Supabase Auth user (auth.users.id)
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name      TEXT        NOT NULL,
    last_name       TEXT        NOT NULL,
    mobile_number   TEXT        NOT NULL,
    email           TEXT        NOT NULL UNIQUE,
    role            user_role   NOT NULL DEFAULT 'patient',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 4. Index on role for admin queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- 5. Auto-update the updated_at timestamp on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON users;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all profiles
CREATE POLICY "Authenticated users can read profiles"
    ON users FOR SELECT
    TO authenticated
    USING (true);

-- Allow anyone to insert (needed for signup before session is fully established)
CREATE POLICY "Allow insert during signup"
    ON users FOR INSERT
    WITH CHECK (true);

-- Allow users to update only their own row
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
