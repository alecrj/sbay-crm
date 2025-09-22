import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email') || '99alecrodriguez@gmail.com';

    console.log('Testing invitation lookup for:', email);

    // Test the exact same query as magic-login
    const { data: invitation, error: invitationError } = await supabase
      .from('invited_users')
      .select('*')
      .eq('email', email)
      .eq('status', 'accepted')
      .single();

    console.log('Invitation data:', invitation);
    console.log('Invitation error:', invitationError);

    // Also test without the single() to see all matching records
    const { data: allInvitations, error: allError } = await supabase
      .from('invited_users')
      .select('*')
      .eq('email', email);

    console.log('All invitations:', allInvitations);
    console.log('All error:', allError);

    return NextResponse.json({
      success: true,
      email,
      invitation,
      invitationError: invitationError?.message,
      allInvitations,
      allError: allError?.message,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}