import { NextRequest, NextResponse } from 'next/server';
import { getAvailableTimeSlots } from '@/lib/google-calendar';

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
    // Validate API key if provided
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.PUBLIC_API_KEY;

    if (expectedApiKey && apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateString = searchParams.get('date');
    const durationString = searchParams.get('duration') || '60';

    if (!dateString) {
      return NextResponse.json(
        { error: 'Date parameter is required (YYYY-MM-DD format)' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse and validate date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return NextResponse.json(
        { error: 'Cannot get availability for past dates' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse duration
    const duration = parseInt(durationString);
    if (isNaN(duration) || duration < 15 || duration > 480) {
      return NextResponse.json(
        { error: 'Duration must be between 15 and 480 minutes' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get business hours from settings or use defaults
    const businessHours = {
      start: 9, // 9 AM
      end: 17,  // 5 PM
    };

    // Get available time slots
    const availableSlots = await getAvailableTimeSlots(date, duration, businessHours);

    // Format slots for frontend consumption
    const formattedSlots = availableSlots.map(slot => ({
      datetime: slot.toISOString(),
      time: slot.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      timestamp: slot.getTime(),
    }));

    // Group slots by time periods
    const groupedSlots = {
      morning: formattedSlots.filter(slot => {
        const hour = new Date(slot.datetime).getHours();
        return hour >= 9 && hour < 12;
      }),
      afternoon: formattedSlots.filter(slot => {
        const hour = new Date(slot.datetime).getHours();
        return hour >= 12 && hour < 17;
      }),
    };

    return NextResponse.json(
      {
        success: true,
        date: dateString,
        duration: duration,
        businessHours: {
          start: `${businessHours.start}:00`,
          end: `${businessHours.end}:00`,
        },
        totalAvailable: formattedSlots.length,
        slots: formattedSlots,
        groupedSlots,
        timezone: 'America/New_York',
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error getting appointment availability:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to get appointment availability'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}