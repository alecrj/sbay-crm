-- Debug magic login access issues
-- Run this in your Supabase SQL editor to check and fix RLS policies

-- First, let's check if the record exists
SELECT email, role, status, expires_at, created_at
FROM invited_users
WHERE email = '99alecrodriguez@gmail.com';

-- Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'invited_users';

-- The issue is likely that RLS is blocking public access to check invitations
-- We need to allow public SELECT access for magic link verification

-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Admins can manage all invitations" ON invited_users;
DROP POLICY IF EXISTS "Users can see their own invitations" ON invited_users;

-- Allow public read access for magic link verification (email checking)
CREATE POLICY "Public can check invitation status for magic links" ON invited_users
FOR SELECT USING (true);

-- Allow authenticated admins to manage all invitations
CREATE POLICY "Admins can manage all invitations" ON invited_users
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Verify the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'invited_users';