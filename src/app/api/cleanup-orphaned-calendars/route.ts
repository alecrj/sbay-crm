import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        error: 'Server configuration error: Missing database credentials'
      }, { status: 500 })
    }

    // Call the cleanup function via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/cleanup_orphaned_calendars`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const result = await response.json()
      console.log('Orphaned calendars cleanup result:', result)

      return NextResponse.json({
        success: true,
        result: result,
        message: 'Orphaned calendars cleaned up successfully'
      })
    } else {
      const errorData = await response.json()
      console.error('Cleanup function failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      })

      return NextResponse.json({
        error: `Cleanup failed: ${errorData.message || 'Unknown error'}`,
        details: errorData,
        debug: {
          status: response.status,
          statusText: response.statusText
        }
      }, { status: response.status })
    }
  } catch (error: any) {
    console.error('Cleanup API error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to cleanup orphaned calendars'
    }, { status: 500 })
  }
}