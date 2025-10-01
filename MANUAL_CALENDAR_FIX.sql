-- MANUAL CALENDAR FIX
-- Run this SQL in your Supabase SQL editor to fix the existing property calendar
-- This ensures your existing property has proper calendar availability

-- 1. Ensure the property calendar exists
INSERT INTO property_calendars (
  property_id,
  property_title,
  property_size,
  property_county,
  is_active,
  timezone
) VALUES (
  'c21cdd24-bfcd-4cec-bff0-9aae187cac1b',
  'property1 new system',
  '25000 SF',
  'Miami-Dade',
  true,
  'America/New_York'
) ON CONFLICT (property_id) DO UPDATE SET
  property_title = EXCLUDED.property_title,
  property_size = EXCLUDED.property_size,
  property_county = EXCLUDED.property_county,
  is_active = EXCLUDED.is_active,
  timezone = EXCLUDED.timezone;

-- 2. Delete any existing availability for this property
DELETE FROM calendar_availability
WHERE property_id = 'c21cdd24-bfcd-4cec-bff0-9aae187cac1b';

-- 3. Add default Monday-Friday business hours
INSERT INTO calendar_availability (
  property_id,
  day_of_week,
  start_time,
  end_time,
  is_active
) VALUES
  ('c21cdd24-bfcd-4cec-bff0-9aae187cac1b', 1, '09:00:00', '17:00:00', true),  -- Monday
  ('c21cdd24-bfcd-4cec-bff0-9aae187cac1b', 2, '09:00:00', '17:00:00', true),  -- Tuesday
  ('c21cdd24-bfcd-4cec-bff0-9aae187cac1b', 3, '09:00:00', '17:00:00', true),  -- Wednesday
  ('c21cdd24-bfcd-4cec-bff0-9aae187cac1b', 4, '09:00:00', '17:00:00', true),  -- Thursday
  ('c21cdd24-bfcd-4cec-bff0-9aae187cac1b', 5, '09:00:00', '17:00:00', true);  -- Friday

-- 4. Verify the setup
SELECT
  pc.property_title,
  pc.is_active as calendar_active,
  ca.day_of_week,
  CASE ca.day_of_week
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day_name,
  ca.start_time,
  ca.end_time,
  ca.is_active as day_active
FROM property_calendars pc
LEFT JOIN calendar_availability ca ON pc.property_id = ca.property_id
WHERE pc.property_id = 'c21cdd24-bfcd-4cec-bff0-9aae187cac1b'
ORDER BY ca.day_of_week;