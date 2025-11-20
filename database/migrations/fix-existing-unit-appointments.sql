-- Fix existing appointments that were booked for units before the shared calendar fix
-- This updates old appointments to use the parent building calendar system

-- Update appointments where property_id is a unit (has parent_property_id)
-- Set property_id to parent building and unit_id to the original unit
UPDATE appointments a
SET
    unit_id = a.property_id,
    property_id = p.parent_property_id
FROM properties p
WHERE a.property_id = p.id
  AND p.parent_property_id IS NOT NULL
  AND a.unit_id IS NULL; -- Only update if not already migrated

-- Show what was updated
SELECT
    COUNT(*) as fixed_appointments,
    'Appointments migrated to use parent building calendar' as note
FROM appointments a
JOIN properties p ON a.unit_id = p.id
WHERE p.parent_property_id IS NOT NULL;
