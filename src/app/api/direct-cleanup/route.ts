import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    console.log('Starting direct cleanup of all calendar data...')

    // Delete all calendar availability
    const availabilityResponse = await fetch(`${supabaseUrl}/rest/v1/calendar_availability`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('Calendar availability deletion status:', availabilityResponse.status)

    // Delete all blocked dates
    const blockedResponse = await fetch(`${supabaseUrl}/rest/v1/calendar_blocked_dates`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('Blocked dates deletion status:', blockedResponse.status)

    // Delete all property calendars
    const calendarsResponse = await fetch(`${supabaseUrl}/rest/v1/property_calendars`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('Property calendars deletion status:', calendarsResponse.status)

    return NextResponse.json({
      success: true,
      message: 'Direct cleanup completed - all calendar data deleted',
      statuses: {
        availability: availabilityResponse.status,
        blocked: blockedResponse.status,
        calendars: calendarsResponse.status
      }
    })

  } catch (error: any) {
    console.error('Direct cleanup error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to perform direct cleanup'
    }, { status: 500 })
  }
}