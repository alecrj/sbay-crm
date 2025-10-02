-- Migration to fix lead status values and RLS policy
-- This fixes the issue where leads aren't showing up in the CRM interface

-- 1. Drop the existing status constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- 2. Add the new status constraint with correct values
ALTER TABLE leads ADD CONSTRAINT leads_status_check
CHECK (status IN ('new', 'tour-scheduled', 'canceled-no-show', 'showing-completed', 'won', 'lost'));

-- 3. Drop and recreate the RLS policy to allow viewing unassigned leads
DROP POLICY IF EXISTS "Leads are viewable by assigned user or admins" ON leads;

CREATE POLICY "Leads are viewable by assigned user or admins" ON leads
    FOR SELECT USING (assigned_to = auth.uid() OR assigned_to IS NULL OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 4. Verify the changes
SELECT
    'Status constraint updated' as step,
    COUNT(*) as lead_count
FROM leads
WHERE status = 'new';