-- Add Okeechobee to the allowed counties in properties table
-- This migration updates the CHECK constraint to include Okeechobee county

-- Step 1: Drop the existing constraint
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_county_check;

-- Step 2: Add updated constraint with all valid counties
ALTER TABLE properties ADD CONSTRAINT properties_county_check
  CHECK (county IN ('Miami-Dade', 'Broward', 'Palm Beach', 'St. Lucie', 'Okeechobee'));
