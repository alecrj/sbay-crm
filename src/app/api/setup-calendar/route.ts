import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('Setting up calendar system for existing property...');

    const propertyId = 'c21cdd24-bfcd-4cec-bff0-9aae187cac1b';

    // 1. Ensure property calendar exists
    const { data: calendar, error: calendarError } = await supabaseAdmin
      .from('property_calendars')
      .upsert({
        property_id: propertyId,
        property_title: 'property1 new system',
        property_size: '25000 SF',
        property_county: 'Miami-Dade',
        is_active: true,
        timezone: 'America/New_York'
      })
      .select()
      .single();

    if (calendarError) {
      console.error('Error creating calendar:', calendarError);
      return NextResponse.json({ error: 'Failed to create calendar', details: calendarError }, { status: 500 });
    }

    // 2. Delete any existing availability first
    await supabaseAdmin
      .from('calendar_availability')
      .delete()
      .eq('property_id', propertyId);

    // 3. Set up default Monday-Friday business hours
    const availabilityEntries = [
      { property_id: propertyId, day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_active: true }, // Monday
      { property_id: propertyId, day_of_week: 2, start_time: '09:00:00', end_time: '17:00:00', is_active: true }, // Tuesday
      { property_id: propertyId, day_of_week: 3, start_time: '09:00:00', end_time: '17:00:00', is_active: true }, // Wednesday
      { property_id: propertyId, day_of_week: 4, start_time: '09:00:00', end_time: '17:00:00', is_active: true }, // Thursday
      { property_id: propertyId, day_of_week: 5, start_time: '09:00:00', end_time: '17:00:00', is_active: true }  // Friday
    ];

    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('calendar_availability')
      .insert(availabilityEntries)
      .select();

    if (availabilityError) {
      console.error('Error creating availability:', availabilityError);
      return NextResponse.json({ error: 'Failed to create availability', details: availabilityError }, { status: 500 });
    }

    console.log('Calendar configured successfully!');

    return NextResponse.json({
      success: true,
      message: 'Calendar system configured successfully for existing property',
      data: {
        calendar,
        availability,
        property_id: propertyId
      }
    });

  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({
      error: 'Failed to set up calendar system',
      details: error.message
    }, { status: 500 });
  }
}