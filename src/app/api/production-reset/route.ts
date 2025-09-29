import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        error: 'Server configuration error: Missing database credentials'
      }, { status: 500 })
    }

    console.log('Starting production database reset...')

    // First create the cleanup function
    const createFunctionResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: `
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
        `
      })
    })

    // Delete all calendar availability
    await fetch(`${supabaseUrl}/rest/v1/calendar_availability`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    })

    // Delete all blocked dates
    await fetch(`${supabaseUrl}/rest/v1/calendar_blocked_dates`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    })

    // Delete all property calendars
    await fetch(`${supabaseUrl}/rest/v1/property_calendars`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    })

    // Delete all properties
    await fetch(`${supabaseUrl}/rest/v1/properties`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('Production database reset completed successfully!')

    return NextResponse.json({
      success: true,
      message: 'Production database reset completed - all properties and calendars deleted'
    })

  } catch (error: any) {
    console.error('Production reset error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to reset production database'
    }, { status: 500 })
  }
}