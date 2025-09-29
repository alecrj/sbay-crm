import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get all property calendars
    const { data: calendars, error } = await supabaseAdmin
      .from('property_calendars')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching property calendars:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ calendars: calendars || [] })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}