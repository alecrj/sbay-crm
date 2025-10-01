import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('Creating calendar database tables...');

    // Create the calendar tables using raw SQL
    const tableCreationSQL = `
      -- Create property_calendars table
      CREATE TABLE IF NOT EXISTS property_calendars (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id VARCHAR(255) UNIQUE NOT NULL,
        property_title VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create calendar_availability table
      CREATE TABLE IF NOT EXISTS calendar_availability (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id VARCHAR(255) NOT NULL,
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(property_id, day_of_week)
      );

      -- Create calendar_blocked_dates table
      CREATE TABLE IF NOT EXISTS calendar_blocked_dates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        calendar_id UUID REFERENCES property_calendars(id) ON DELETE CASCADE,
        blocked_date DATE NOT NULL,
        reason VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_property_calendars_property_id ON property_calendars(property_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_availability_property_id ON calendar_availability(property_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_availability_day_of_week ON calendar_availability(day_of_week);
      CREATE INDEX IF NOT EXISTS idx_calendar_blocked_dates_calendar_id ON calendar_blocked_dates(calendar_id);
      CREATE INDEX IF NOT EXISTS idx_calendar_blocked_dates_date ON calendar_blocked_dates(blocked_date);
    `;

    // Execute the SQL to create tables
    const { error: createError } = await supabaseAdmin.rpc('sql', {
      query: tableCreationSQL
    });

    if (createError) {
      console.error('Error creating tables:', createError);
      return NextResponse.json({ error: 'Failed to create tables', details: createError }, { status: 500 });
    }

    console.log('Calendar tables created successfully');

    // Now set up calendar data for the actual property
    const propertyId = 'c21cdd24-bfcd-4cec-bff0-9aae187cac1b';

    // 1. Create property calendar
    const { data: calendar, error: calendarError } = await supabaseAdmin
      .from('property_calendars')
      .upsert({
        property_id: propertyId,
        property_title: 'property1 new system',
        is_active: true
      })
      .select()
      .single();

    if (calendarError) {
      console.error('Error creating calendar:', calendarError);
      return NextResponse.json({ error: 'Failed to create calendar', details: calendarError }, { status: 500 });
    }

    // 2. Set up availability for Tuesdays only (day 2)
    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('calendar_availability')
      .upsert({
        property_id: propertyId,
        day_of_week: 2, // Tuesday
        start_time: '09:00:00',
        end_time: '17:00:00',
        is_active: true
      })
      .select();

    if (availabilityError) {
      console.error('Error creating availability:', availabilityError);
      return NextResponse.json({ error: 'Failed to create availability', details: availabilityError }, { status: 500 });
    }

    console.log('Sample calendar data created');

    return NextResponse.json({
      success: true,
      message: 'Calendar system set up successfully with sample data',
      tables_created: true,
      sample_data: {
        calendar,
        availability
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