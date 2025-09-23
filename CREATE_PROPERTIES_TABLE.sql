-- Create properties table for the CRM system
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('warehouse', 'office', 'industrial', 'flex-space', 'distribution')),
  location TEXT NOT NULL,
  county TEXT CHECK (county IN ('Miami-Dade', 'Broward', 'Palm Beach')),
  price TEXT NOT NULL,
  size TEXT NOT NULL,
  available BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  description TEXT,
  image TEXT,
  gallery JSONB,
  features JSONB,
  street_address TEXT,
  city TEXT,
  state TEXT DEFAULT 'FL',
  zip_code TEXT,
  lease_term TEXT,
  clear_height TEXT,
  loading_docks INTEGER,
  parking INTEGER,
  year_built INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_county ON properties(county);
CREATE INDEX IF NOT EXISTS idx_properties_available ON properties(available);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (drop existing ones first)
DROP POLICY IF EXISTS "Allow public read access to available properties" ON properties;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON properties;

-- Allow public read access to available properties
CREATE POLICY "Allow public read access to available properties" ON properties
    FOR SELECT USING (available = true);

-- Allow authenticated users to manage all properties
CREATE POLICY "Allow authenticated users full access" ON properties
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert some sample properties for testing (only if table is empty)
INSERT INTO properties (
  title, type, location, county, price, size, description, featured, available,
  features, street_address, city, state, zip_code
)
SELECT * FROM (VALUES
(
  'Modern Warehouse in Doral',
  'warehouse',
  'Doral, FL',
  'Miami-Dade',
  '$12.50/SF/Year',
  '25,000 SF',
  'Brand new warehouse facility with modern amenities, high ceilings, and excellent truck access. Perfect for distribution and logistics operations.',
  true,
  true,
  '["Loading Docks", "High Ceilings", "Modern HVAC", "Security System", "Truck Access"]'::jsonb,
  '8900 NW 97th Ave',
  'Doral',
  'FL',
  '33178'
),
(
  'Executive Office Space in Brickell',
  'office',
  'Brickell, Miami, FL',
  'Miami-Dade',
  '$45.00/SF/Year',
  '5,000 SF',
  'Premium office space in the heart of Brickell with stunning city views. Fully furnished with modern amenities and conference rooms.',
  true,
  true,
  '["City Views", "Furnished", "Conference Rooms", "High-Speed Internet", "Parking Included"]'::jsonb,
  '1450 Brickell Ave',
  'Miami',
  'FL',
  '33131'
),
(
  'Industrial Facility in Hialeah',
  'industrial',
  'Hialeah, FL',
  'Miami-Dade',
  '$8.75/SF/Year',
  '40,000 SF',
  'Large industrial facility suitable for manufacturing, assembly, or heavy storage operations. Includes overhead cranes and specialized electrical.',
  false,
  true,
  '["Overhead Cranes", "Heavy Power", "Rail Access", "Large Lot", "Specialized Equipment"]'::jsonb,
  '7200 NW 79th Ave',
  'Hialeah',
  'FL',
  '33166'
)) AS new_data(title, type, location, county, price, size, description, featured, available, features, street_address, city, state, zip_code)
WHERE NOT EXISTS (SELECT 1 FROM properties LIMIT 1);

-- Verify the data was inserted
SELECT title, type, location, price, featured, available FROM properties ORDER BY created_at;