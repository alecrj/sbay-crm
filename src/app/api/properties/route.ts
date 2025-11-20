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

    console.log('Creating property with direct insert approach...')

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
      featured: rawPropertyData.featured !== undefined ? rawPropertyData.featured : false,
      // Ensure property_type and parent_property_id are included
      property_type: rawPropertyData.property_type || 'single',
      parent_property_id: rawPropertyData.parent_property_id || null
    }

    console.log('Raw property data received:', rawPropertyData)
    console.log('Cleaned property data:', propertyData)

    // Insert property directly using supabaseAdmin
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .insert([propertyData])
      .select()
      .single()

    if (propertyError) {
      console.error('Error creating property:', propertyError)
      return NextResponse.json({
        error: `Failed to create property: ${propertyError.message}`,
        details: propertyError
      }, { status: 500 })
    }

    console.log('Property created successfully:', { propertyId: property.id, propertyType: propertyData.property_type, parentPropertyId: propertyData.parent_property_id })

    // Create calendar logic:
    // - Standalone single properties: YES (property_type = 'single' AND parent_property_id IS NULL)
    // - Multi-unit buildings: YES (property_type = 'multi_unit') - they have the shared calendar
    // - Individual units: NO (property_type = 'single' AND parent_property_id IS NOT NULL) - they use parent's calendar
    const shouldCreateCalendar =
      (propertyData.property_type === 'single' && !propertyData.parent_property_id) || // Standalone property
      (propertyData.property_type === 'multi_unit'); // Multi-unit building (shared calendar)

    if (shouldCreateCalendar) {
      console.log('Creating calendar for property:', property.id)

      const { error: calendarError } = await supabaseAdmin
        .from('property_calendars')
        .insert([{
          property_id: property.id,
          property_title: propertyData.title,
          property_size: propertyData.size,
          property_county: propertyData.county,
          is_active: true,
          timezone: 'America/New_York'
        }])

      if (calendarError) {
        console.error('Error creating calendar:', calendarError)
        // Don't fail the whole request if calendar creation fails
      } else {
        console.log('Calendar created successfully for property:', property.id)
      }
    } else {
      console.log('Skipping calendar creation for unit (uses parent building calendar):', property.id)
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
      property: property,
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