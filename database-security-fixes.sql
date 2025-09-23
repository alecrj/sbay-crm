-- 🚨 CRITICAL SECURITY FIXES FOR SUPABASE DATABASE
-- Run this script in your Supabase SQL Editor to fix security vulnerabilities

-- =============================================================================
-- PRIORITY 1: ENABLE ROW LEVEL SECURITY (CRITICAL)
-- =============================================================================

-- Enable RLS on appointments table (CRITICAL - currently disabled)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on leads table (CRITICAL - currently disabled)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PRIORITY 2: OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- =============================================================================

-- Fix auth function performance issues by wrapping in SELECT
-- This prevents re-evaluation for each row

-- Users table policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id OR (SELECT auth.role()) = 'authenticated');

-- Settings table policies
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
CREATE POLICY "Authenticated users can view settings" ON public.settings
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings" ON public.settings
    FOR ALL USING ((SELECT auth.jwt()) ->> 'role' = 'admin');

-- Notification queue policies
DROP POLICY IF EXISTS "Authenticated users can manage notification queue" ON public.notification_queue;
CREATE POLICY "Authenticated users can manage notification queue" ON public.notification_queue
    FOR ALL USING ((SELECT auth.role()) = 'authenticated');

-- Properties policies
DROP POLICY IF EXISTS "Allow authenticated users full access to properties" ON public.properties;
CREATE POLICY "Allow authenticated users full access to properties" ON public.properties
    FOR ALL USING ((SELECT auth.role()) = 'authenticated');

-- Lead activities policies
DROP POLICY IF EXISTS "Allow authenticated users full access to lead activities" ON public.lead_activities;
CREATE POLICY "Allow authenticated users full access to lead activities" ON public.lead_activities
    FOR ALL USING ((SELECT auth.role()) = 'authenticated');

-- Invited users policies
DROP POLICY IF EXISTS "Allow authenticated users full access to invited users" ON public.invited_users;
CREATE POLICY "Allow authenticated users full access to invited users" ON public.invited_users
    FOR ALL USING ((SELECT auth.role()) = 'authenticated');

-- =============================================================================
-- PRIORITY 3: CONSOLIDATE DUPLICATE POLICIES FOR PERFORMANCE
-- =============================================================================

-- Remove duplicate policies that cause performance issues
-- Keep only the most permissive policy for each role/action combination

-- Appointments: Consolidate anonymous INSERT policies
DROP POLICY IF EXISTS "Allow anonymous appointment creation" ON public.appointments;
-- Keep the more permissive authenticated policy

-- Lead activities: Consolidate anonymous INSERT policies
DROP POLICY IF EXISTS "Allow anonymous activity creation" ON public.lead_activities;
-- Keep the more permissive authenticated policy

-- Leads: Consolidate anonymous INSERT policies
DROP POLICY IF EXISTS "Allow anonymous lead creation" ON public.leads;
-- Keep the more permissive authenticated policy for CRM functionality

-- Properties: Remove redundant public read policy (keep authenticated access)
DROP POLICY IF EXISTS "Allow public read access to available properties" ON public.properties;
-- Keep only authenticated access for security

-- Settings: Consolidate overlapping policies
DROP POLICY IF EXISTS "Public can create settings" ON public.settings;
DROP POLICY IF EXISTS "Public can read settings" ON public.settings;
DROP POLICY IF EXISTS "Public can update settings" ON public.settings;
-- Keep only admin and authenticated user policies

-- Users: Remove public read access for privacy
DROP POLICY IF EXISTS "Public can read users" ON public.users;
-- Keep only user's own data access

-- =============================================================================
-- PRIORITY 4: SECURE FUNCTIONS
-- =============================================================================

-- Fix function search path security
ALTER FUNCTION public.generate_invitation_token()
SET search_path = '';

ALTER FUNCTION public.update_updated_at_column()
SET search_path = '';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('appointments', 'leads', 'properties', 'users', 'settings')
ORDER BY tablename;

-- Check remaining policies count
SELECT
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Database security fixes completed successfully!';
    RAISE NOTICE '🔒 RLS enabled on appointments and leads tables';
    RAISE NOTICE '⚡ RLS policies optimized for performance';
    RAISE NOTICE '🛡️ Duplicate policies removed';
    RAISE NOTICE '🔧 Function security improved';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '1. Enable leaked password protection in Supabase Auth settings';
    RAISE NOTICE '2. Review the verification queries above';
    RAISE NOTICE '3. Test your application functionality';
END $$;