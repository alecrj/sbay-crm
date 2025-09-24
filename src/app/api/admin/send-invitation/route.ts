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

    // Check if this is a resend (existing invitation)
    const { data: existing } = await supabaseAdmin
      .from('invited_users')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    let invitation;
    let invitationToken;

    if (existing) {
      // This is a resend - use existing invitation
      invitation = existing;
      invitationToken = existing.invitation_token;
      console.log('Resending existing invitation for:', email);
    } else {
      // This is a new invitation - create new record
      console.log('Creating new invitation for:', email);

      // Generate secure invitation token
      invitationToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation record
      const { data: newInvitation, error: dbError } = await supabaseAdmin
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

      invitation = newInvitation;
    }

    // Create the invitation link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const invitationLink = `${siteUrl}/login?action=set_password&token=${invitationToken}&email=${encodeURIComponent(email)}`;

    // For now, we'll create the invitation record and return success
    // The user will need to use the invitation link manually
    console.log('Invitation processed successfully:', {
      email,
      role,
      invitationLink
    });

    return NextResponse.json({
      success: true,
      message: existing ? `Invitation resent to ${email}` : `Invitation created for ${email}`,
      invitation: {
        email,
        role,
        status: 'pending',
        expires_at: invitation.expires_at,
        invitationLink // Include the link in the response for now
      }
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    console.error('Error stringified:', JSON.stringify(error));
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      toString: error?.toString?.()
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : `Failed to send invitation: ${String(error)}`,
        details: error instanceof Error ? error.stack : `Error type: ${typeof error}, Constructor: ${error?.constructor?.name}, String: ${String(error)}`,
        rawError: String(error)
      },
      { status: 500 }
    );
  }
}