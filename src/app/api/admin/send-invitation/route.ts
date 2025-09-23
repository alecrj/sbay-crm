import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, role, invitedBy } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Check if email already exists as invitation
    const { data: existing } = await supabase
      .from('invited_users')
      .select('*')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This email is already invited' },
        { status: 400 }
      );
    }

    // Create invitation record
    const { data: invitation, error } = await supabase
      .from('invited_users')
      .insert([{
        email,
        role,
        invited_by: invitedBy,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // TODO: Add email sending functionality here
    // For now, we'll just return success and provide manual instructions

    return NextResponse.json({
      success: true,
      message: `Invitation created for ${email}. Share the signup link with them.`,
      invitation,
      instructions: {
        signupUrl: process.env.NEXT_PUBLIC_SITE_URL + '/login',
        steps: [
          'Share the signup URL with the invited user',
          'They should click "Need to set up account?" on the login page',
          'They enter their email and create a password',
          'Their account will be automatically approved based on the invitation'
        ]
      }
    });

  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}