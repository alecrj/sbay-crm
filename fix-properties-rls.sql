-- Fix Row Level Security for Properties table
-- Run this in your Supabase SQL Editor

-- First, let's check if the properties table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('warehouse', 'office', 'industrial', 'flex-space', 'distribution')),
  location TEXT NOT NULL,
  county TEXT NOT NULL CHECK (county IN ('Miami-Dade', 'Broward', 'Palm Beach')),
  price TEXT NOT NULL,
  size TEXT NOT NULL,
  available BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  description TEXT,
  image TEXT,
  gallery TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  street_address TEXT,
  city TEXT,
  state TEXT DEFAULT 'FL',
  zip_code TEXT,
  lease_term TEXT,
  clear_height TEXT,
  loading_docks INTEGER DEFAULT 0,
  parking INTEGER DEFAULT 0,
  year_built INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on properties table
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to properties" ON properties;
DROP POLICY IF EXISTS "Allow public insert access to properties" ON properties;
DROP POLICY IF EXISTS "Allow public update access to properties" ON properties;
DROP POLICY IF EXISTS "Allow public delete access to properties" ON properties;

-- Create policies that allow public access (since this is a CRM without authentication yet)
-- In production, you'd want authenticated-only policies

-- Allow anyone to read properties (for website display)
CREATE POLICY "Allow public read access to properties" ON properties
  FOR SELECT
  USING (true);

-- Allow anyone to insert properties (for CRM creation)
CREATE POLICY "Allow public insert access to properties" ON properties
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update properties (for CRM editing)
CREATE POLICY "Allow public update access to properties" ON properties
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anyone to delete properties (for CRM management)
CREATE POLICY "Allow public delete access to properties" ON properties
  FOR DELETE
  USING (true);

-- Create storage bucket for property images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to property images storage
CREATE POLICY IF NOT EXISTS "Public Access to Property Images" ON storage.objects
  FOR ALL USING (bucket_id = 'property-images');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON properties TO anon;
GRANT ALL ON properties TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_county ON properties(county);
CREATE INDEX IF NOT EXISTS idx_properties_available ON properties(available);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);

COMMENT ON TABLE properties IS 'Commercial real estate properties for Shallow Bay Advisors';
COMMENT ON POLICY "Allow public read access to properties" ON properties IS 'Allows website visitors to view properties';
COMMENT ON POLICY "Allow public insert access to properties" ON properties IS 'Allows CRM to create new properties';
COMMENT ON POLICY "Allow public update access to properties" ON properties IS 'Allows CRM to edit properties';
COMMENT ON POLICY "Allow public delete access to properties" ON properties IS 'Allows CRM to delete properties';