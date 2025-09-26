-- Add St. Lucie County to the properties county constraint
-- Run this in Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_county_check;

-- Add the new constraint with St. Lucie County included
ALTER TABLE properties ADD CONSTRAINT properties_county_check
CHECK (county IN ('Miami-Dade', 'Broward', 'Palm Beach', 'St. Lucie') OR county IS NULL);

-- Verify the constraint was added
SELECT conname, consrc
FROM pg_constraint
WHERE conname = 'properties_county_check';