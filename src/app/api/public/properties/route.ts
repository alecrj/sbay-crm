import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Public API endpoint for website to fetch properties
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const featured = searchParams.get('featured')
    const available = searchParams.get('available')
    const type = searchParams.get('type')
    const county = searchParams.get('county')
    const limit = searchParams.get('limit')

    let query = supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters if provided
    if (featured === 'true') {
      query = query.eq('featured', true)
    }

    if (available === 'true') {
      query = query.eq('available', true)
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (county) {
      query = query.eq('county', county)
    }

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data: properties, error } = await query

    if (error) {
      console.error('Error fetching properties:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    // Add CORS headers for website access
    const response = NextResponse.json({
      success: true,
      properties: properties || [],
      count: properties?.length || 0
    })

    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return response

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch properties',
      details: error.message
    }, { status: 500 })
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}