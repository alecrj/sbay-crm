-- Setup RLS policies for calendar tables

-- Enable RLS on calendar tables
ALTER TABLE property_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Property Calendars policies
CREATE POLICY "Enable read access for all users" ON property_calendars FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON property_calendars FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON property_calendars FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON property_calendars FOR DELETE USING (true);

-- Calendar Availability policies
CREATE POLICY "Enable read access for all users" ON calendar_availability FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON calendar_availability FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON calendar_availability FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON calendar_availability FOR DELETE USING (true);

-- Calendar Blocked Dates policies
CREATE POLICY "Enable read access for all users" ON calendar_blocked_dates FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON calendar_blocked_dates FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON calendar_blocked_dates FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON calendar_blocked_dates FOR DELETE USING (true);

-- Grant permissions to service role
GRANT ALL ON property_calendars TO service_role;
GRANT ALL ON calendar_availability TO service_role;
GRANT ALL ON calendar_blocked_dates TO service_role;

-- Grant permissions to authenticated users
GRANT ALL ON property_calendars TO authenticated;
GRANT ALL ON calendar_availability TO authenticated;
GRANT ALL ON calendar_blocked_dates TO authenticated;