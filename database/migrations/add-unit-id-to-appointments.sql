-- Migration: Add unit_id to appointments table
-- Date: 2025-01-20
-- Description: Adds unit_id field to track which specific unit a booking is for when using shared building calendars

-- Add unit_id column to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES properties(id) ON DELETE SET NULL;

-- Create index for faster queries on unit appointments
CREATE INDEX IF NOT EXISTS idx_appointments_unit_id ON appointments(unit_id);

-- Add comment to column for documentation
COMMENT ON COLUMN appointments.unit_id IS 'For multi-unit buildings: references the specific unit the prospect is interested in. NULL for single properties or building-level appointments';

-- Note: property_id will now reference the parent building for multi-unit appointments
-- The logic is:
-- - Single property: property_id = the property, unit_id = NULL
-- - Multi-unit building: property_id = parent building (for calendar), unit_id = specific unit (for tracking interest)
