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

    return NextResponse.json({
      success: true,
      message: 'Property deleted successfully'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}