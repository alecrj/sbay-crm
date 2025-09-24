import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client for sending invitations
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing required environment variables for Supabase admin client');
  }

  // Create client with service role key - this enables admin methods
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Environment variables check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL,
      // Don't log the actual key for security
    });

    // Initialize Supabase admin client
    const supabaseAdmin = createSupabaseAdmin();
    console.log('Supabase admin client created:', {
      hasAuth: !!supabaseAdmin.auth,
      hasAdmin: !!supabaseAdmin.auth?.admin,
      hasGetUserByEmail: !!supabaseAdmin.auth?.admin?.getUserByEmail
    });

    const { email, role, invitedBy } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Check if user already exists - skip this check for now as it requires admin API
    // We'll rely on invitation token uniqueness instead

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

    // Create the invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite&token=${invitationToken}`;

    // For now, we'll create the invitation record and return success
    // The user will need to use the invitation link manually
    console.log('Invitation created successfully:', {
      email,
      role,
      invitationLink
    });

    return NextResponse.json({
      success: true,
      message: `Invitation created for ${email}`,
      invitation: {
        email,
        role,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        invitationLink // Include the link in the response for now
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