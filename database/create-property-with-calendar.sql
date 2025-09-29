-- Create a database function to create property with calendar
-- This bypasses RLS issues by running as a privileged function

CREATE OR REPLACE FUNCTION create_property_with_calendar(
  property_data jsonb
) RETURNS jsonb AS $$
DECLARE
  new_property_id uuid;
  result jsonb;
BEGIN
  -- Generate UUID for property
  new_property_id := gen_random_uuid();

  -- Insert property with generated ID
  INSERT INTO properties (
    id,
    title,
    type,
    location,
    county,
    price,
    size,
    available,
    featured,
    description,
    image,
    gallery,
    features,
    street_address,
    city,
    state,
    zip_code,
    lease_term,
    clear_height,
    loading_docks,
    parking,
    year_built,
    created_at,
    updated_at
  ) VALUES (
    new_property_id,
    (property_data->>'title'),
    (property_data->>'type'),
    (property_data->>'location'),
    (property_data->>'county'),
    (property_data->>'price'),
    (property_data->>'size'),
    COALESCE((property_data->>'available')::boolean, true),
    COALESCE((property_data->>'featured')::boolean, false),
    (property_data->>'description'),
    (property_data->>'image'),
    COALESCE((property_data->>'gallery')::jsonb, '[]'::jsonb),
    COALESCE((property_data->>'features')::jsonb, '[]'::jsonb),
    (property_data->>'street_address'),
    (property_data->>'city'),
    COALESCE((property_data->>'state'), 'FL'),
    (property_data->>'zip_code'),
    (property_data->>'lease_term'),
    (property_data->>'clear_height'),
    COALESCE((property_data->>'loading_docks')::integer, 0),
    COALESCE((property_data->>'parking')::integer, 0),
    COALESCE((property_data->>'year_built')::integer, EXTRACT(YEAR FROM NOW())::integer),
    NOW(),
    NOW()
  );

  -- Create property calendar
  INSERT INTO property_calendars (
    property_id,
    property_title,
    property_size,
    property_county,
    is_active,
    timezone
  ) VALUES (
    new_property_id,
    (property_data->>'title'),
    (property_data->>'size'),
    (property_data->>'county'),
    true,
    'America/New_York'
  );

  -- Create default business hours (Monday-Friday 9AM-5PM)
  INSERT INTO calendar_availability (
    property_id,
    day_of_week,
    start_time,
    end_time,
    is_available
  ) VALUES
    (new_property_id, 1, '09:00:00', '17:00:00', true),  -- Monday
    (new_property_id, 2, '09:00:00', '17:00:00', true),  -- Tuesday
    (new_property_id, 3, '09:00:00', '17:00:00', true),  -- Wednesday
    (new_property_id, 4, '09:00:00', '17:00:00', true),  -- Thursday
    (new_property_id, 5, '09:00:00', '17:00:00', true);  -- Friday

  -- Return the created property data
  SELECT to_jsonb(p.*) INTO result
  FROM properties p
  WHERE p.id = new_property_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION create_property_with_calendar(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_property_with_calendar(jsonb) TO service_role;