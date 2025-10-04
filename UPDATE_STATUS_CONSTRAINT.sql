-- Update the leads table status constraint to include new statuses
-- This fixes the "violates check constraint" error when creating leads with status 'tour-scheduled'

-- First, drop the old constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add the new constraint with updated status values
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'tour-scheduled', 'canceled-no-show', 'showing-completed', 'won', 'lost'));
