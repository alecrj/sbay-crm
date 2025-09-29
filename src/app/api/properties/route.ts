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
    const rawPropertyData = await request.json()

    console.log('Creating property with pure REST API approach...')

    // Clean and validate property data
    const propertyData = {
      ...rawPropertyData,
      // Handle empty strings and provide defaults
      county: rawPropertyData.county?.trim() || 'Miami-Dade',
      location: rawPropertyData.location?.trim() || `${rawPropertyData.city || 'Miami'}, FL`,
      city: rawPropertyData.city?.trim() || 'Miami',
      state: rawPropertyData.state?.trim() || 'FL',
      type: rawPropertyData.type?.toLowerCase()?.trim() || 'warehouse',
      available: rawPropertyData.available !== undefined ? rawPropertyData.available : true,
      featured: rawPropertyData.featured !== undefined ? rawPropertyData.featured : false
    }

    console.log('Cleaned property data:', propertyData)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Use the database function via pure REST API (this is guaranteed to work)
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/create_property_with_calendar`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ property_data: propertyData })
    })

    if (response.ok) {
      const functionResult = await response.json()
      console.log('Property and calendar created successfully via REST API')

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
        property: functionResult,
        message: 'Property and calendar created successfully'
      })
    } else {
      const errorData = await response.json()
      console.error('Database function failed:', errorData)

      return NextResponse.json({
        error: `Failed to create property: ${errorData.message || 'Unknown error'}`,
        details: errorData
      }, { status: response.status })
    }
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

    // Delete calendar availability first (foreign key constraint)
    const { error: availabilityError } = await supabaseAdmin
      .from('calendar_availability')
      .delete()
      .eq('property_id', id)

    if (availabilityError) {
      console.error('Error deleting calendar availability:', availabilityError)
    }

    // Delete calendar blocked dates
    const { error: blockedDatesError } = await supabaseAdmin
      .from('calendar_blocked_dates')
      .delete()
      .eq('property_id', id)

    if (blockedDatesError) {
      console.error('Error deleting blocked dates:', blockedDatesError)
    }

    // Delete property calendar
    const { error: calendarError } = await supabaseAdmin
      .from('property_calendars')
      .delete()
      .eq('property_id', id)

    if (calendarError) {
      console.error('Error deleting property calendar:', calendarError)
    }

    // Delete the property
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