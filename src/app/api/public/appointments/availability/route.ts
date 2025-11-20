import { NextRequest, NextResponse } from 'next/server';
import { getAvailableTimeSlots } from '@/lib/property-availability';
import { supabaseAdmin } from '@/lib/supabase';

// CORS headers for cross-origin requests from the public website
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_WEBSITE_URL || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const date = searchParams.get('date');
    const duration = parseInt(searchParams.get('duration') || '30');

    // Validate required parameters
    if (!propertyId || !date) {
      return NextResponse.json(
        { error: 'propertyId and date are required parameters' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate date format
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return NextResponse.json(
        { error: 'Cannot book appointments for past dates' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if this is a unit in a multi-unit building
    // If so, we need to use the parent building's calendar
    let calendarPropertyId = propertyId;

    const { data: propertyData, error: propError } = await supabaseAdmin
      .from('properties')
      .select('id, title, parent_property_id')
      .eq('id', propertyId)
      .single();

    if (propError || !propertyData) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // If this is a unit (has parent_property_id), use the parent's calendar
    if (propertyData.parent_property_id) {
      calendarPropertyId = propertyData.parent_property_id;
      console.log(`Unit detected. Using parent building calendar: ${calendarPropertyId}`);
    }

    // Verify calendar exists for the property (or parent building)
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('property_calendars')
      .select('id, property_title, is_active')
      .eq('property_id', calendarPropertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found or no calendar configured' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!property.is_active) {
      return NextResponse.json(
        {
          error: 'Property calendar is currently inactive',
          available_slots: []
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Get available time slots using the original propertyId
    // The getAvailableTimeSlots function will handle parent lookup internally
    const slots = await getAvailableTimeSlots(propertyId, date, duration);

    // Format slots for frontend consumption
    // Slots are in UTC, convert to EDT for display
    const formattedSlots = slots.map(slot => {
      // Convert UTC time to EDT by subtracting 4 hours for display
      const edtTime = new Date(slot.start.getTime() - (4 * 60 * 60 * 1000));
      return {
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        display_time: edtTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'UTC' // Display the EDT time as-is without further conversion
        }),
        duration: duration
      };
    });

    return NextResponse.json(
      {
        success: true,
        property: {
          id: propertyId,
          title: property.property_title,
          is_active: property.is_active
        },
        date: date,
        duration: duration,
        available_slots: formattedSlots,
        total_slots: formattedSlots.length
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch availability'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}