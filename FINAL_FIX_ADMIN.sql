-- Final fix for admin account access
-- Run this in your Supabase SQL editor

-- First, let's see what we have
SELECT email, role, status, expires_at FROM invited_users WHERE email = '99alecrodriguez@gmail.com';

-- Update your account to make sure it's properly set up
INSERT INTO invited_users (email, role, status, invitation_token, expires_at)
VALUES (
  '99alecrodriguez@gmail.com',
  'admin',
  'accepted',
  encode(gen_random_bytes(32), 'hex'),
  timezone('utc'::text, now() + interval '365 days')
)
ON CONFLICT (email) DO UPDATE SET
  role = 'admin',
  status = 'accepted',
  expires_at = timezone('utc'::text, now() + interval '365 days');

-- Verify it worked
SELECT email, role, status, expires_at FROM invited_users WHERE email = '99alecrodriguez@gmail.com';