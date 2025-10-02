-- Create calendar_blocked_dates table for managing property-specific blocked dates
-- This allows blocking specific dates even when the day of week is normally available

CREATE TABLE IF NOT EXISTS calendar_blocked_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one blocked date per property per date
  UNIQUE(property_id, blocked_date)
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_blocked_dates_property_date
ON calendar_blocked_dates(property_id, blocked_date);

-- Add index for date range queries
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date
ON calendar_blocked_dates(blocked_date);

-- Add RLS (Row Level Security) policies
ALTER TABLE calendar_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access blocked dates for properties they own
CREATE POLICY "Users can manage blocked dates for their properties"
ON calendar_blocked_dates
FOR ALL
USING (
  property_id IN (
    SELECT id FROM properties WHERE user_id = auth.uid()
  )
);

-- Policy: Public read access for calendar availability checks
CREATE POLICY "Public read access for blocked dates"
ON calendar_blocked_dates
FOR SELECT
USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_blocked_dates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blocked_dates_updated_at
  BEFORE UPDATE ON calendar_blocked_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_blocked_dates_updated_at();