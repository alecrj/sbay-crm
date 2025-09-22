-- Simplify roles to just admin and user
-- Run this in your Supabase SQL editor

-- Update the role constraint to only allow admin and user
ALTER TABLE invited_users
DROP CONSTRAINT IF EXISTS invited_users_role_check;

ALTER TABLE invited_users
ADD CONSTRAINT invited_users_role_check
CHECK (role IN ('admin', 'user'));

-- Update any existing roles to the new simplified system
UPDATE invited_users
SET role = 'user'
WHERE role NOT IN ('admin');

-- Also update the users table if it exists
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('admin', 'user'));

UPDATE users
SET role = 'user'
WHERE role NOT IN ('admin');

-- Verify the changes
SELECT email, role, status FROM invited_users;