import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    // Get all properties
    const { data: properties, error: propertiesError } = await supabaseAdmin
      .from('properties')
      .select('id, title, size, county')

    if (propertiesError) {
      return NextResponse.json({ error: propertiesError.message }, { status: 500 })
    }

    // Get existing calendars to avoid duplicates
    const { data: existingCalendars, error: calendarsError } = await supabaseAdmin
      .from('property_calendars')
      .select('property_id')

    if (calendarsError) {
      return NextResponse.json({ error: calendarsError.message }, { status: 500 })
    }

    const existingPropertyIds = new Set(existingCalendars.map(cal => cal.property_id))
    const propertiesNeedingCalendars = properties.filter(prop => !existingPropertyIds.has(prop.id))

    if (propertiesNeedingCalendars.length === 0) {
      return NextResponse.json({
        message: 'All properties already have calendars',
        totalProperties: properties.length,
        calendarsCreated: 0
      })
    }

    // Create calendars for properties that don't have them
    const calendarPromises = propertiesNeedingCalendars.map(async (property) => {
      // Create property calendar
      const calendarData = {
        property_id: property.id,
        property_title: property.title,
        property_size: property.size,
        property_county: property.county,
        is_active: true,
        timezone: 'America/New_York'
      }

      const { error: calendarError } = await supabaseAdmin
        .from('property_calendars')
        .insert([calendarData])

      if (calendarError) {
        console.error(`Error creating calendar for property ${property.id}:`, calendarError)
        throw calendarError
      }

      // Create default business hours (Mon-Fri 9AM-5PM)
      const defaultAvailability = []
      for (let day = 1; day <= 5; day++) { // Monday to Friday
        defaultAvailability.push({
          property_id: property.id,
          day_of_week: day,
          start_time: '09:00:00',
          end_time: '17:00:00',
          is_available: true
        })
      }

      const { error: availabilityError } = await supabaseAdmin
        .from('calendar_availability')
        .insert(defaultAvailability)

      if (availabilityError) {
        console.error(`Error creating availability for property ${property.id}:`, availabilityError)
        throw availabilityError
      }

      return {
        propertyId: property.id,
        title: property.title,
        success: true
      }
    })

    const results = await Promise.allSettled(calendarPromises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected')

    return NextResponse.json({
      message: `Calendar sync completed`,
      totalProperties: properties.length,
      calendarsCreated: successful,
      failed: failed.length,
      errors: failed.map(f => f.status === 'rejected' ? f.reason : null)
    })

  } catch (error: any) {
    console.error('Calendar sync error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to sync calendars'
    }, { status: 500 })
  }
}