-- ============================================================================
-- BarrioMed: Patient Medical Info Table + Storage Bucket
-- Run this SQL in the Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Create the patient_medical_info table
CREATE TABLE IF NOT EXISTS patient_medical_info (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    height              NUMERIC NOT NULL,           -- cm
    weight              NUMERIC NOT NULL,           -- kg
    bmi                 NUMERIC NOT NULL,           -- auto-calculated on insert/update
    blood_type          VARCHAR(4) NOT NULL CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    profile_picture_url TEXT,                       -- public URL from media bucket
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One record per user (upsert-friendly)
    CONSTRAINT uq_patient_medical_user UNIQUE (user_id)
);

-- 2. Index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_pmi_user_id ON patient_medical_info (user_id);

-- 3. Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_pmi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pmi_updated_at ON patient_medical_info;
CREATE TRIGGER set_pmi_updated_at
    BEFORE UPDATE ON patient_medical_info
    FOR EACH ROW
    EXECUTE FUNCTION update_pmi_updated_at();

-- 4. Auto-calculate BMI on insert/update
CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.height > 0 THEN
        NEW.bmi = ROUND(NEW.weight / POWER(NEW.height / 100.0, 2), 1);
    ELSE
        NEW.bmi = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_calculate_bmi ON patient_medical_info;
CREATE TRIGGER auto_calculate_bmi
    BEFORE INSERT OR UPDATE ON patient_medical_info
    FOR EACH ROW
    EXECUTE FUNCTION calculate_bmi();

-- 5. Row Level Security
ALTER TABLE patient_medical_info ENABLE ROW LEVEL SECURITY;

-- Users can read all medical info (for family records)
CREATE POLICY "Authenticated users can read medical info"
    ON patient_medical_info FOR SELECT
    TO authenticated
    USING (true);

-- Users can insert their own record
CREATE POLICY "Users can insert own medical info"
    ON patient_medical_info FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own record
CREATE POLICY "Users can update own medical info"
    ON patient_medical_info FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Storage Bucket Setup (run separately in Supabase Dashboard → Storage)
-- Or via SQL:
-- ============================================================================

-- Create the media storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own profile picture"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own profile picture"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow public read access for profile pictures
CREATE POLICY "Public read access for profile pictures"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'media');
