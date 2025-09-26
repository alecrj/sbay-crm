import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Helper function to trigger property sync webhook
async function triggerPropertySync() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/webhooks/property-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to trigger property sync:', error);
    // Don't fail the main operation for webhook errors
  }
}

export async function GET() {
  try {
    const { data: properties, error } = await supabase
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

    // For now, we'll use a direct SQL query to bypass RLS
    // In production, you'd want proper authentication and RLS policies
    const { data, error } = await supabase
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

    // Trigger website rebuild
    await triggerPropertySync();

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

    const { data, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger website rebuild
    await triggerPropertySync();

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

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger website rebuild
    await triggerPropertySync();

    return NextResponse.json({
      success: true,
      message: 'Property deleted successfully'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}