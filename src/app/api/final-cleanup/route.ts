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

    console.log('Starting final cleanup of all calendar tables...')

    // Step 1: Delete all calendar availability
    const availabilityResponse = await fetch(`${supabaseUrl}/rest/v1/calendar_availability`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('✓ Deleted calendar availability, status:', availabilityResponse.status)

    // Step 2: Delete all blocked dates
    const blockedResponse = await fetch(`${supabaseUrl}/rest/v1/calendar_blocked_dates`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('✓ Deleted blocked dates, status:', blockedResponse.status)

    // Step 3: Delete all property calendars
    const calendarsResponse = await fetch(`${supabaseUrl}/rest/v1/property_calendars`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('✓ Deleted property calendars, status:', calendarsResponse.status)

    // Step 4: Verify cleanup - count remaining records
    const countAvailability = await fetch(`${supabaseUrl}/rest/v1/calendar_availability?select=count`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'count=exact'
      }
    })

    const countBlocked = await fetch(`${supabaseUrl}/rest/v1/calendar_blocked_dates?select=count`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'count=exact'
      }
    })

    const countCalendars = await fetch(`${supabaseUrl}/rest/v1/property_calendars?select=count`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'count=exact'
      }
    })

    const availabilityCount = countAvailability.headers.get('content-range')?.split('/')[1] || '0'
    const blockedCount = countBlocked.headers.get('content-range')?.split('/')[1] || '0'
    const calendarCount = countCalendars.headers.get('content-range')?.split('/')[1] || '0'

    console.log('Final cleanup completed!')
    console.log('Remaining records - Availability:', availabilityCount, 'Blocked:', blockedCount, 'Calendars:', calendarCount)

    return NextResponse.json({
      success: true,
      message: 'Final cleanup completed - all calendar data deleted',
      statuses: {
        availability: availabilityResponse.status,
        blocked: blockedResponse.status,
        calendars: calendarsResponse.status
      },
      remaining: {
        availability: parseInt(availabilityCount),
        blocked: parseInt(blockedCount),
        calendars: parseInt(calendarCount)
      }
    })

  } catch (error: any) {
    console.error('Final cleanup error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to perform final cleanup'
    }, { status: 500 })
  }
}