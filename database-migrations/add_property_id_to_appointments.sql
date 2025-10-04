-- Add property_id column to appointments table for double booking prevention
-- This allows us to check for overlapping appointments on the same property

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_property_id ON appointments(property_id);

-- Add comment for documentation
COMMENT ON COLUMN appointments.property_id IS 'Property associated with this appointment for tour bookings';
