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
    console.log('Fixing calendar availability for property1 new system...');

    // Your actual property ID
    const propertyId = 'c21cdd24-bfcd-4cec-bff0-9aae187cac1b';

    // Delete existing availability for this property to start fresh
    const { error: deleteError } = await supabaseAdmin
      .from('calendar_availability')
      .delete()
      .eq('property_id', propertyId);

    if (deleteError) {
      console.error('Error deleting existing availability:', deleteError);
    }

    // Set up availability for Tuesdays only (once per week as requested)
    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('calendar_availability')
      .insert({
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

    console.log('Calendar availability fixed successfully');

    return NextResponse.json({
      success: true,
      message: 'Calendar availability fixed successfully for property1 new system',
      propertyId: propertyId,
      availability: availability,
      note: 'Property is now available for booking on Tuesdays from 9:00 AM to 5:00 PM'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Fix error:', error);
    return NextResponse.json({
      error: 'Failed to fix calendar availability',
      details: error.message
    }, { status: 500, headers: corsHeaders });
  }
}