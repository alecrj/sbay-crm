-- Fix admin access for magic link system
-- Run this in your Supabase SQL editor

-- First, fix the invitation token function
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Clear any existing invitation for your email and recreate properly
DELETE FROM invited_users WHERE email = '99alecrodriguez@gmail.com';

-- Insert your admin email with proper setup
INSERT INTO invited_users (email, role, status, invitation_token, expires_at)
VALUES (
  '99alecrodriguez@gmail.com',
  'admin',
  'accepted',
  generate_invitation_token(),
  timezone('utc'::text, now() + interval '365 days') -- Valid for 1 year
);

-- Verify the insertion worked
SELECT email, role, status, expires_at, created_at
FROM invited_users
WHERE email = '99alecrodriguez@gmail.com';