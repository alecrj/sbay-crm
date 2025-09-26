import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// CORS headers for public API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const featured = searchParams.get('featured') === 'true';
    const available = searchParams.get('available') === 'true';
    const type = searchParams.get('type');
    const county = searchParams.get('county');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // Build query
    let query = supabaseAdmin
      .from('properties')
      .select('*');

    // Apply filters
    if (featured) {
      query = query.eq('featured', true);
    }

    if (available !== false) { // Default to available properties only
      query = query.eq('available', true);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (county) {
      query = query.ilike('location', `%${county}%`);
    }

    // Apply ordering - featured first, then by created_at desc
    query = query.order('featured', { ascending: false })
                 .order('created_at', { ascending: false });

    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    const { data: properties, error } = await query;

    if (error) {
      console.error('Error fetching properties:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch properties' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        properties: properties || [],
        count: properties?.length || 0
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error in properties API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}