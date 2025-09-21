-- Shallow Bay Advisors CRM Database Schema

-- Enable RLS (Row Level Security)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'assistant')),
  avatar TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('warehouse', 'office', 'industrial', 'flex-space', 'distribution')),
  location VARCHAR(255) NOT NULL,
  county VARCHAR(20) NOT NULL CHECK (county IN ('Miami-Dade', 'Broward', 'Palm Beach')),
  price VARCHAR(50) NOT NULL,
  size VARCHAR(50) NOT NULL,
  available BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  description TEXT,
  image TEXT,
  gallery JSONB DEFAULT '[]',
  features JSONB DEFAULT '[]',
  street_address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(10) DEFAULT 'FL',
  zip_code VARCHAR(10),
  lease_term VARCHAR(100),
  clear_height VARCHAR(50),
  loading_docks INTEGER,
  parking INTEGER,
  year_built INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('consultation', 'property-inquiry', 'general-inquiry', 'contact-form')),
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal-sent', 'closed-won', 'closed-lost')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  company VARCHAR(255),
  property_interest VARCHAR(255),
  space_requirements TEXT,
  budget VARCHAR(100),
  timeline VARCHAR(100),
  message TEXT,
  source VARCHAR(30) DEFAULT 'website' CHECK (source IN ('website', 'referral', 'cold-call', 'email-campaign', 'social-media', 'trade-show', 'other')),
  consultation_date DATE,
  consultation_time VARCHAR(20),
  follow_up_date DATE,
  internal_notes TEXT,
  assigned_to UUID REFERENCES users(id),
  property_id UUID REFERENCES properties(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255),
  attendees JSONB DEFAULT '[]',
  google_calendar_event_id VARCHAR(255),
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_2h_sent BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table for site configuration
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead activity log for tracking interactions
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL, -- 'call', 'email', 'meeting', 'note', 'status_change'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location);
CREATE INDEX IF NOT EXISTS idx_properties_county ON properties(county);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_available ON properties(available);
CREATE INDEX IF NOT EXISTS idx_properties_featured ON properties(featured);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('site_title', '"Shallow Bay Advisors"', 'Website title'),
('site_description', '"South Florida''s premier commercial real estate advisors"', 'Website description'),
('contact_email', '"info@shabay.com"', 'Primary contact email'),
('contact_phone', '"(305) 123-4567"', 'Primary contact phone'),
('office_address', '"123 Business Way, Miami, FL 33101"', 'Office address'),
('business_hours', '"Monday - Friday: 9AM - 6PM"', 'Business operating hours'),
('notification_emails', '["admin@shabay.com"]', 'Email addresses for notifications'),
('google_analytics_id', '""', 'Google Analytics tracking ID'),
('calendar_booking_enabled', 'true', 'Enable calendar booking widget'),
('lead_auto_assignment', 'true', 'Enable automatic lead assignment'),
('notifications_email_enabled', 'true', 'Enable email notifications'),
('notifications_sms_enabled', 'false', 'Enable SMS notifications'),
('notifications_email_provider', '"resend"', 'Email provider (resend, sendgrid, nodemailer)'),
('notifications_sms_provider', '"twilio"', 'SMS provider (twilio, vonage)'),
('notifications_from_email', '"noreply@shallowbayadvisors.com"', 'From email address for notifications'),
('notifications_from_name', '"Shallow Bay Advisors"', 'From name for email notifications')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own data and admins can read all
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Properties are readable by all authenticated users
CREATE POLICY "Properties are viewable by authenticated users" ON properties
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only authenticated users can insert/update properties
CREATE POLICY "Authenticated users can manage properties" ON properties
    FOR ALL USING (auth.role() = 'authenticated');

-- Leads are viewable by assigned user or admins
CREATE POLICY "Leads are viewable by assigned user or admins" ON leads
    FOR SELECT USING (assigned_to = auth.uid() OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Similar policies for other tables...
CREATE POLICY "Authenticated users can manage leads" ON leads
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage appointments" ON appointments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view settings" ON settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage settings" ON settings
    FOR ALL USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Authenticated users can manage lead activities" ON lead_activities
    FOR ALL USING (auth.role() = 'authenticated');

-- Notification queue table for scheduled notifications
CREATE TABLE notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(100) NOT NULL, -- 'appointment_reminder_24h', 'appointment_reminder_2h', 'new_lead_notification', etc.
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  recipient_name VARCHAR(255) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  reminder_type VARCHAR(20), -- '24h', '2h', 'immediate'
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notification queue
CREATE INDEX idx_notification_queue_status_scheduled ON notification_queue(status, scheduled_for);
CREATE INDEX idx_notification_queue_appointment ON notification_queue(appointment_id);
CREATE INDEX idx_notification_queue_lead ON notification_queue(lead_id);
CREATE INDEX idx_notification_queue_type ON notification_queue(type);

-- Enable RLS for notification queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage notification queue" ON notification_queue
    FOR ALL USING (auth.role() = 'authenticated');