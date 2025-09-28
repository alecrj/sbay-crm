import { NextRequest, NextResponse } from 'next/server';
import { getAvailableTimeSlots } from '@/lib/property-availability';
import { supabase } from '@/lib/supabase';

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
    const duration = parseInt(searchParams.get('duration') || '60');

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

    // Verify property exists
    const { data: property, error: propertyError } = await supabase
      .from('property_calendars')
      .select('id, property_title, is_active')
      .eq('property_id', propertyId)
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

    // Get available time slots
    const slots = await getAvailableTimeSlots(propertyId, date, duration);

    // Format slots for frontend consumption
    const formattedSlots = slots.map(slot => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      display_time: slot.start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      duration: duration
    }));

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