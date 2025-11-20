-- Check for existing appointments that reference unit properties
-- These would need to be migrated to use parent building IDs

-- Find all appointments that reference a unit (property with parent_property_id)
SELECT
    a.id as appointment_id,
    a.title as appointment_title,
    a.start_time,
    p.id as unit_id,
    p.title as unit_title,
    p.parent_property_id as parent_building_id,
    parent.title as parent_building_title
FROM appointments a
JOIN properties p ON a.property_id = p.id
JOIN properties parent ON p.parent_property_id = parent.id
WHERE p.parent_property_id IS NOT NULL
  AND a.status != 'cancelled'
ORDER BY a.start_time DESC;

-- Summary count
SELECT COUNT(*) as total_unit_appointments_to_migrate
FROM appointments a
JOIN properties p ON a.property_id = p.id
WHERE p.parent_property_id IS NOT NULL
  AND a.status != 'cancelled';
