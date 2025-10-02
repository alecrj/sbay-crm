import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client for admin access (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching leads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { leadId, status } = await request.json();

    if (!leadId || !status) {
      return NextResponse.json(
        { error: 'Lead ID and status are required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId);

    if (error) {
      console.error('Error updating lead status:', error);
      return NextResponse.json(
        { error: 'Failed to update lead status' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase
      .from('lead_activities')
      .insert([{
        lead_id: leadId,
        activity_type: 'status_change',
        title: 'Status updated',
        description: `Lead status changed to ${status}`,
        metadata: { new_status: status }
      }]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}