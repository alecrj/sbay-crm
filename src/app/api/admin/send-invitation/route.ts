import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client for sending invitations
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing required environment variables for Supabase admin client');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createSupabaseAdmin();

    const { email, role, invitedBy } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (existingUser.user) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check if email already has pending invitation
    const { data: existing } = await supabaseAdmin
      .from('invited_users')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This email already has a pending invitation' },
        { status: 400 }
      );
    }

    // Generate secure invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const { data: invitation, error: dbError } = await supabaseAdmin
      .from('invited_users')
      .insert([{
        email,
        role,
        invited_by: invitedBy,
        status: 'pending',
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    // Send invitation email using Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          role: role,
          invited_by: invitedBy,
          invitation_token: invitationToken
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite&token=${invitationToken}`
      }
    );

    if (authError) {
      // If email sending fails, clean up the invitation record
      await supabaseAdmin
        .from('invited_users')
        .delete()
        .eq('id', invitation.id);

      throw authError;
    }

    return NextResponse.json({
      success: true,
      message: `Invitation email sent to ${email}`,
      invitation: {
        email,
        role,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invitation' },
      { status: 500 }
    );
  }
}