# Database Setup for Shallow Bay Advisors CRM

Run these SQL commands in your Supabase SQL Editor:

## Properties Table
```sql
-- Create properties table
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('warehouse', 'office', 'industrial', 'flex-space', 'distribution')),
  location TEXT NOT NULL,
  size TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT NOT NULL,
  featured BOOLEAN DEFAULT false,
  available BOOLEAN DEFAULT true,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create policy for properties (admin/agents can manage, public can read available/featured)
CREATE POLICY "Public can read available properties" ON properties
FOR SELECT USING (available = true);

CREATE POLICY "Authenticated users can manage properties" ON properties
FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for properties
CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Additional Tables (if needed)

### Leads Table (if not exists)
```sql
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  property_interest TEXT,
  space_requirements TEXT,
  budget TEXT,
  timeline TEXT,
  county TEXT,
  message TEXT,
  source TEXT DEFAULT 'unknown',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage leads" ON leads
FOR ALL USING (auth.role() = 'authenticated');
```

### Appointments Table (if not exists)
```sql
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  location TEXT DEFAULT 'Office Meeting',
  duration INTEGER DEFAULT 60,
  message TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  google_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage appointments" ON appointments
FOR ALL USING (auth.role() = 'authenticated');
```

### Users Table (if not exists)
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'assistant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

## Run these commands in order:
1. Copy the Properties Table SQL
2. Run it in Supabase SQL Editor
3. Verify the table was created successfully
4. Test the CRM Properties page at http://localhost:3000/properties

## Notes:
- Properties added in the CRM will be accessible via the public API
- Your website can fetch properties from: `https://sbaycrm.netlify.app/api/public/properties`
- Featured properties will be highlighted on the website
- Only available properties will show up on the website