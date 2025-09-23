-- COMPLETE CRM DATABASE SETUP
-- Run this ENTIRE script in your Supabase SQL Editor to fix all issues
-- This will create/recreate all tables with correct schemas

-- 1. ENABLE NECESSARY EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE HELPER FUNCTION FOR TIMESTAMPS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. DROP EXISTING TABLES IF THEY EXIST (to start fresh)
DROP TABLE IF EXISTS lead_activities CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS invited_users CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;

-- 4. CREATE PROPERTIES TABLE
CREATE TABLE properties (
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
  gallery JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
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

-- 5. CREATE LEADS TABLE
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'New Lead',
  type TEXT NOT NULL DEFAULT 'property-inquiry' CHECK (type IN ('consultation', 'property-inquiry', 'general-inquiry', 'contact-form')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal-sent', 'closed-won', 'closed-lost')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  property_interest TEXT,
  space_requirements TEXT,
  budget TEXT,
  timeline TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'referral', 'cold-call', 'email-campaign', 'social-media', 'trade-show', 'other')),
  consultation_date DATE,
  consultation_time TIME,
  follow_up_date DATE,
  internal_notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CREATE LEAD ACTIVITIES TABLE
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'status_change', 'assignment')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- 7. CREATE INVITED USERS TABLE
CREATE TABLE invited_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CREATE APPOINTMENTS TABLE (OPTIONAL - FOR FUTURE USE)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  attendees TEXT[] DEFAULT '{}',
  google_calendar_event_id TEXT,
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_2h_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_county ON properties(county);
CREATE INDEX IF NOT EXISTS idx_properties_available ON properties(available);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_invited_users_email ON invited_users(email);
CREATE INDEX IF NOT EXISTS idx_invited_users_status ON invited_users(status);

CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id);

-- 10. CREATE TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invited_users_updated_at ON invited_users;
CREATE TRIGGER update_invited_users_updated_at
    BEFORE UPDATE ON invited_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE invited_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 12. CREATE RLS POLICIES
-- Properties policies
DROP POLICY IF EXISTS "Allow public read access to available properties" ON properties;
DROP POLICY IF EXISTS "Allow authenticated users full access to properties" ON properties;

CREATE POLICY "Allow public read access to available properties" ON properties
    FOR SELECT USING (available = true);

CREATE POLICY "Allow authenticated users full access to properties" ON properties
    FOR ALL USING (auth.role() = 'authenticated');

-- Leads policies
DROP POLICY IF EXISTS "Allow authenticated users full access to leads" ON leads;
CREATE POLICY "Allow authenticated users full access to leads" ON leads
    FOR ALL USING (auth.role() = 'authenticated');

-- Lead activities policies
DROP POLICY IF EXISTS "Allow authenticated users full access to lead activities" ON lead_activities;
CREATE POLICY "Allow authenticated users full access to lead activities" ON lead_activities
    FOR ALL USING (auth.role() = 'authenticated');

-- Invited users policies
DROP POLICY IF EXISTS "Allow authenticated users full access to invited users" ON invited_users;
CREATE POLICY "Allow authenticated users full access to invited users" ON invited_users
    FOR ALL USING (auth.role() = 'authenticated');

-- Appointments policies
DROP POLICY IF EXISTS "Allow authenticated users full access to appointments" ON appointments;
CREATE POLICY "Allow authenticated users full access to appointments" ON appointments
    FOR ALL USING (auth.role() = 'authenticated');

-- 13. INSERT SAMPLE DATA FOR TESTING

-- Insert your admin user
INSERT INTO invited_users (email, role, status) VALUES
('99alecrodriguez@gmail.com', 'admin', 'accepted')
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status;

-- Insert sample properties
INSERT INTO properties (
  title, type, location, county, price, size, description, featured, available, features
) VALUES
(
  'Modern Warehouse in Doral',
  'warehouse',
  'Doral, FL',
  'Miami-Dade',
  '$12.50/SF/Year',
  '25,000 SF',
  'Brand new warehouse facility with modern amenities, high ceilings, and excellent truck access.',
  true,
  true,
  '["Loading Docks", "High Ceilings", "Modern HVAC", "Security System", "Truck Access"]'::jsonb
),
(
  'Executive Office Space in Brickell',
  'office',
  'Brickell, Miami, FL',
  'Miami-Dade',
  '$45.00/SF/Year',
  '5,000 SF',
  'Premium office space in the heart of Brickell with stunning city views.',
  true,
  true,
  '["City Views", "Furnished", "Conference Rooms", "High-Speed Internet", "Parking Included"]'::jsonb
),
(
  'Industrial Facility in Hialeah',
  'industrial',
  'Hialeah, FL',
  'Miami-Dade',
  '$8.75/SF/Year',
  '40,000 SF',
  'Large industrial facility suitable for manufacturing and heavy storage operations.',
  false,
  true,
  '["Overhead Cranes", "Heavy Power", "Rail Access", "Large Lot", "Specialized Equipment"]'::jsonb
);

-- Insert sample leads
INSERT INTO leads (
  title, type, status, priority, name, email, phone, company,
  property_interest, budget, timeline, message, source
) VALUES
(
  'Website Inquiry - Miami Warehouse',
  'property-inquiry',
  'new',
  'high',
  'John Smith',
  'john.smith@example.com',
  '(305) 555-0123',
  'ABC Logistics Inc',
  'Warehouse 15,000-20,000 SF in Miami-Dade',
  '$10-14/SF/Year',
  'Next 60 days',
  'Looking for warehouse space near the airport with good truck access.',
  'website'
),
(
  'Referral - Office Space Downtown',
  'consultation',
  'contacted',
  'medium',
  'Sarah Johnson',
  'sarah.j@techcorp.com',
  '(954) 555-0456',
  'Tech Corp Solutions',
  'Office space 5,000-8,000 SF in Brickell/Downtown',
  '$35-45/SF/Year',
  'Next 90 days',
  'Growing tech company needs modern office space.',
  'referral'
),
(
  'Cold Call Follow-up',
  'general-inquiry',
  'qualified',
  'urgent',
  'Mike Rodriguez',
  'mrodriguez@distributionco.com',
  '(786) 555-0789',
  'Miami Distribution Co',
  'Distribution center 40,000+ SF',
  '$8-12/SF/Year',
  'Next 30 days',
  'Expanding operations and need large distribution facility.',
  'cold-call'
);

-- Insert lead activities for sample leads
INSERT INTO lead_activities (lead_id, activity_type, title, description)
SELECT
    l.id,
    'note',
    'Lead created',
    'Initial lead created for ' || l.name
FROM leads l;

-- 14. VERIFY SETUP
SELECT 'Properties table' as table_name, COUNT(*) as record_count FROM properties
UNION ALL
SELECT 'Leads table', COUNT(*) FROM leads
UNION ALL
SELECT 'Lead activities table', COUNT(*) FROM lead_activities
UNION ALL
SELECT 'Invited users table', COUNT(*) FROM invited_users
UNION ALL
SELECT 'Appointments table', COUNT(*) FROM appointments;

-- Success message
SELECT 'DATABASE SETUP COMPLETE! ✅' as status,
       'All tables created with sample data' as message;