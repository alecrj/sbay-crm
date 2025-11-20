-- Migration: Update existing unit appointments to use parent building calendar
-- Date: 2025-01-20
-- Description: Migrates existing appointments for units to reference parent building
--              This ensures they show up in the shared building calendar

-- IMPORTANT: Run this AFTER adding the unit_id column

-- Update existing appointments for units:
-- - Set property_id to parent building (for shared calendar)
-- - Set unit_id to the original unit property (for tracking)
UPDATE appointments a
SET
    unit_id = a.property_id,
    property_id = p.parent_property_id
FROM properties p
WHERE a.property_id = p.id
  AND p.parent_property_id IS NOT NULL
  AND a.unit_id IS NULL; -- Only update if not already migrated

-- Verify the migration
SELECT
    COUNT(*) as migrated_appointments,
    'These appointments now reference parent building' as note
FROM appointments a
WHERE a.unit_id IS NOT NULL;
