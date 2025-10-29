-- Create counties table for dynamic county management
CREATE TABLE IF NOT EXISTS counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'FL',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active counties (for public property forms)
CREATE POLICY "Anyone can view active counties"
  ON counties FOR SELECT
  USING (active = true);

-- Only authenticated users can insert/update/delete counties
CREATE POLICY "Authenticated users can manage counties"
  ON counties FOR ALL
  USING (auth.role() = 'authenticated');

-- Seed with existing counties
INSERT INTO counties (name, state, active) VALUES
  ('Miami-Dade', 'FL', true),
  ('Broward', 'FL', true),
  ('Palm Beach', 'FL', true),
  ('St. Lucie', 'FL', true)
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_counties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER counties_updated_at
  BEFORE UPDATE ON counties
  FOR EACH ROW
  EXECUTE FUNCTION update_counties_updated_at();
