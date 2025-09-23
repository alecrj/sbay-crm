-- Create leads table for the CRM system
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('consultation', 'property-inquiry', 'general-inquiry', 'contact-form')),
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

-- Create lead_activities table for tracking lead interactions
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'status_change', 'assignment')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at);

-- Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Allow authenticated users to manage all leads
CREATE POLICY "Allow authenticated users full access to leads" ON leads
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to lead activities" ON lead_activities
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert some sample leads for testing
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
  'Looking for warehouse space near the airport with good truck access and loading docks.',
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
  'Growing tech company needs modern office space with parking and conference rooms.',
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
  'Expanding operations and need large distribution facility with rail access.',
  'cold-call'
);

-- Insert corresponding activities for the sample leads
DO $$
DECLARE
    lead_record RECORD;
BEGIN
    FOR lead_record IN SELECT id, name FROM leads
    LOOP
        INSERT INTO lead_activities (
            lead_id, activity_type, title, description
        ) VALUES (
            lead_record.id,
            'note',
            'Lead created',
            'Initial lead created for ' || lead_record.name
        );
    END LOOP;
END $$;

-- Verify the data was inserted
SELECT
    l.title,
    l.name,
    l.status,
    l.priority,
    l.source,
    COUNT(a.id) as activity_count
FROM leads l
LEFT JOIN lead_activities a ON l.id = a.lead_id
GROUP BY l.id, l.title, l.name, l.status, l.priority, l.source
ORDER BY l.created_at;