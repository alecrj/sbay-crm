import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// CORS headers for public API access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST() {
  try {
    console.log('Setting up calendar for property1 new system...');

    // Your actual property ID
    const propertyId = 'c21cdd24-bfcd-4cec-bff0-9aae187cac1b';
    const propertyTitle = 'property1 new system';

    // 1. Check if tables exist by trying to query them
    // We'll skip table creation and assume they exist in production
    console.log('Skipping table creation - assuming tables exist in production');

    // 2. Create property calendar entry
    const { data: calendar, error: calendarError } = await supabaseAdmin
      .from('property_calendars')
      .upsert({
        property_id: propertyId,
        property_title: propertyTitle,
        is_active: true
      })
      .select()
      .single();

    if (calendarError) {
      console.error('Error creating calendar:', calendarError);
      return NextResponse.json({
        error: 'Failed to create calendar',
        details: calendarError
      }, { status: 500, headers: corsHeaders });
    }

    // 3. Set up availability for Tuesdays only (once per week as requested)
    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('calendar_availability')
      .upsert({
        property_id: propertyId,
        day_of_week: 2, // Tuesday (0=Sunday, 1=Monday, 2=Tuesday, etc.)
        start_time: '09:00:00',
        end_time: '17:00:00',
        is_active: true
      })
      .select();

    if (availabilityError) {
      console.error('Error creating availability:', availabilityError);
      return NextResponse.json({
        error: 'Failed to create availability',
        details: availabilityError
      }, { status: 500, headers: corsHeaders });
    }

    console.log('Calendar setup completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Calendar system set up successfully for property1 new system',
      propertyId: propertyId,
      calendar: calendar,
      availability: availability,
      note: 'Property is now available for booking on Tuesdays from 9:00 AM to 5:00 PM'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({
      error: 'Failed to set up calendar system',
      details: error.message
    }, { status: 500, headers: corsHeaders });
  }
}