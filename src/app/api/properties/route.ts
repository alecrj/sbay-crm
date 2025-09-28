import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Note: Property sync happens automatically via API calls from website
// No webhook needed - website loads properties directly from CRM API

export async function GET() {
  try {
    const { data: properties, error } = await supabaseAdmin
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ properties })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const propertyData = await request.json()

    // Add timestamps
    const now = new Date().toISOString()
    const fullPropertyData = {
      ...propertyData,
      created_at: now,
      updated_at: now,
      id: crypto.randomUUID()
    }

    // Use admin client to bypass RLS for property creation
    const { data, error } = await supabaseAdmin
      .from('properties')
      .insert([fullPropertyData])
      .select()

    if (error) {
      // If RLS is blocking, try with rpc call that has proper permissions
      console.error('Insert error:', error)

      // Alternative: Create a stored procedure in Supabase that has proper permissions
      // For now, let's try to handle the RLS issue

      return NextResponse.json({
        error: `Database error: ${error.message}. You may need to configure Row Level Security policies for the properties table.`,
        details: error
      }, { status: 403 })
    }

    // Auto-create property calendar for the new property
    try {
      const calendarData = {
        property_id: fullPropertyData.id,
        property_title: fullPropertyData.title,
        property_size: fullPropertyData.size,
        property_county: fullPropertyData.county,
        is_active: true,
        timezone: 'America/New_York'
      };

      const { error: calendarError } = await supabaseAdmin
        .from('property_calendars')
        .insert([calendarData]);

      if (calendarError) {
        console.error('Error creating property calendar:', calendarError);
        // Don't fail the property creation if calendar creation fails
      } else {
        // Create default business hours (Mon-Fri 9AM-5PM)
        const defaultAvailability = [];
        for (let day = 1; day <= 5; day++) { // Monday to Friday
          defaultAvailability.push({
            property_id: fullPropertyData.id,
            day_of_week: day,
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_available: true
          });
        }

        const { error: availabilityError } = await supabaseAdmin
          .from('calendar_availability')
          .insert(defaultAvailability);

        if (availabilityError) {
          console.error('Error creating default availability:', availabilityError);
        }
      }
    } catch (calendarCreationError) {
      console.error('Error in calendar auto-creation:', calendarCreationError);
      // Don't fail the property creation if calendar creation fails
    }

    // Trigger website rebuild webhook
    try {
      const webhookUrl = process.env.WEBSITE_BUILD_HOOK_URL;
      if (webhookUrl) {
        console.log('Triggering website rebuild...');
        fetch(webhookUrl, { method: 'POST' }).catch(err =>
          console.error('Webhook failed:', err)
        );
      }
    } catch (error) {
      console.error('Webhook error:', error);
    }

    return NextResponse.json({
      success: true,
      property: data[0],
      message: 'Property created successfully'
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to create property'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
    }

    const propertyData = await request.json()
    const updateData = {
      ...propertyData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger website rebuild webhook
    try {
      const webhookUrl = process.env.WEBSITE_BUILD_HOOK_URL;
      if (webhookUrl) {
        console.log('Triggering website rebuild after update...');
        fetch(webhookUrl, { method: 'POST' }).catch(err =>
          console.error('Update webhook failed:', err)
        );
      }
    } catch (error) {
      console.error('Update webhook error:', error);
    }

    return NextResponse.json({
      success: true,
      property: data[0],
      message: 'Property updated successfully'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('properties')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger website rebuild webhook
    try {
      const webhookUrl = process.env.WEBSITE_BUILD_HOOK_URL;
      if (webhookUrl) {
        console.log('Triggering website rebuild after deletion...');
        fetch(webhookUrl, { method: 'POST' }).catch(err =>
          console.error('Delete webhook failed:', err)
        );
      }
    } catch (error) {
      console.error('Delete webhook error:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Property deleted successfully'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}