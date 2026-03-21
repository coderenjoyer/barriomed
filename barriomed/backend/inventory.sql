-- ============================================================================
-- BarrioMed: E-Botika Inventory Table
-- Run this SQL in the Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Create stock status enum
DO $$ BEGIN
    CREATE TYPE stock_status AS ENUM ('AVAILABLE', 'LOW', 'OUT_OF_STOCK');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create the inventory table
CREATE TABLE IF NOT EXISTS inventory (
    item_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generic_name    VARCHAR NOT NULL,
    brand_name      VARCHAR,
    category        VARCHAR NOT NULL,
    stock_status    stock_status NOT NULL DEFAULT 'AVAILABLE',
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      UUID REFERENCES auth.users(id)
);

-- 3. Auto-update the last_updated timestamp on row changes
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    -- Optionally keep updated_by from the NEW record assuming the client sends it.
    -- Or you can set NEW.updated_by = auth.uid() if you want it strictly from auth token
    IF auth.uid() IS NOT NULL THEN
        NEW.updated_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_update ON inventory;
CREATE TRIGGER trg_inventory_update
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();

-- 4. Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (Residents & Staff) to read the inventory
CREATE POLICY "Authenticated users can read inventory"
    ON inventory FOR SELECT
    TO authenticated
    USING (true);

-- Allow Staff to update the inventory
-- Assuming users table has role = 'health_staff', 'doctor', or 'system_admin'
CREATE POLICY "Staff can update inventory"
    ON inventory FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND role IN ('health_staff', 'system_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND role IN ('health_staff', 'system_admin')
        )
    );

-- Allow Staff to insert new inventory items
CREATE POLICY "Staff can insert inventory"
    ON inventory FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND role IN ('health_staff', 'system_admin')
        )
    );

-- Allow Staff to delete inventory items
CREATE POLICY "Staff can delete inventory"
    ON inventory FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND role IN ('health_staff', 'system_admin')
        )
    );

-- Enable Supabase Realtime for this table
-- This allows clients to listen to changes on the inventory table
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;

-- INSERT SOME MOCK DATA FOR TESTING
INSERT INTO inventory (generic_name, brand_name, category, stock_status) VALUES
('Paracetamol', 'Biogesic', 'Fever', 'AVAILABLE'),
('Amoxicillin', 'Amoxil', 'Antibiotic', 'LOW'),
('Ascorbic Acid', 'Ceelin', 'Vitamins', 'AVAILABLE'),
('Losartan', 'Lifezar', 'Maintenance', 'OUT_OF_STOCK'),
('Ibuprofen', 'Advil', 'Painkiller', 'AVAILABLE')
ON CONFLICT DO NOTHING;
