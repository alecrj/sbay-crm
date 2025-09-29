import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyId = params.id

    // Get the property calendar information
    const { data: calendar, error } = await supabaseAdmin
      .from('property_calendars')
      .select('*')
      .eq('property_id', propertyId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error fetching property calendar:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no calendar exists, return a basic response
    if (!calendar) {
      return NextResponse.json({
        calendar: null,
        message: 'No calendar found for this property'
      })
    }

    // Also get the calendar availability for this property
    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('calendar_availability')
      .select('*')
      .eq('property_id', propertyId)

    if (availabilityError) {
      console.error('Error fetching availability:', availabilityError)
    }

    return NextResponse.json({
      calendar,
      availability: availability || []
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}