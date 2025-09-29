-- Function to clean up orphaned calendar entries
CREATE OR REPLACE FUNCTION cleanup_orphaned_calendars()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  orphaned_count integer := 0;
  cleanup_result jsonb;
BEGIN
  -- First, count how many orphaned calendars exist
  SELECT COUNT(*) INTO orphaned_count
  FROM property_calendars pc
  WHERE NOT EXISTS (
    SELECT 1 FROM properties p WHERE p.id = pc.property_id
  );

  -- Delete calendar availability for orphaned properties
  DELETE FROM calendar_availability
  WHERE property_id IN (
    SELECT pc.property_id
    FROM property_calendars pc
    WHERE NOT EXISTS (
      SELECT 1 FROM properties p WHERE p.id = pc.property_id
    )
  );

  -- Delete blocked dates for orphaned properties
  DELETE FROM calendar_blocked_dates
  WHERE property_id IN (
    SELECT pc.property_id
    FROM property_calendars pc
    WHERE NOT EXISTS (
      SELECT 1 FROM properties p WHERE p.id = pc.property_id
    )
  );

  -- Delete orphaned property calendars
  DELETE FROM property_calendars
  WHERE NOT EXISTS (
    SELECT 1 FROM properties p WHERE p.id = property_calendars.property_id
  );

  -- Return cleanup result
  SELECT jsonb_build_object(
    'success', true,
    'orphaned_calendars_cleaned', orphaned_count,
    'message', 'Orphaned calendar cleanup completed successfully'
  ) INTO cleanup_result;

  RETURN cleanup_result;
END;
$$;