-- Add invited_users table for secure magic link access
CREATE TABLE IF NOT EXISTS invited_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES users(id),
  role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'agent', 'assistant', 'client')),
  invitation_token TEXT UNIQUE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '7 days') NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE invited_users ENABLE ROW LEVEL SECURITY;

-- Policies for invited_users
CREATE POLICY "Admins can manage all invitations" ON invited_users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can see their own invitations" ON invited_users
FOR SELECT USING (email = auth.email());

-- Function to generate invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Add default invitation token when creating invitations
ALTER TABLE invited_users
ALTER COLUMN invitation_token SET DEFAULT generate_invitation_token();

-- Insert your admin email as pre-approved
INSERT INTO invited_users (email, role, status, invitation_token)
VALUES ('99alecrodriguez@gmail.com', 'admin', 'accepted', generate_invitation_token())
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  status = 'accepted';