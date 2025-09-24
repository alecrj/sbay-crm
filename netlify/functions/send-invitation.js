const { createClient } = require('@supabase/supabase-js');

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

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Environment variables check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });

    // Initialize Supabase admin client
    const supabaseAdmin = createSupabaseAdmin();

    const { email, role, invitedBy } = JSON.parse(event.body);

    if (!email || !role) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and role are required' })
      };
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

    // Create the invitation link - use fallback URL if env var is missing
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sbaycrm.netlify.app';
    const invitationLink = `${siteUrl}/login?action=set_password&token=${invitationToken}&email=${encodeURIComponent(email)}`;

    console.log('Site URL from env:', process.env.NEXT_PUBLIC_SITE_URL);
    console.log('Using site URL:', siteUrl);

    // Send invitation email using Supabase Auth
    console.log('=== SENDING INVITATION EMAIL ===');
    console.log('Attempting to send invitation email to:', email);
    console.log('Redirect URL:', invitationLink);

    let emailSent = false;
    let emailError = null;

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            role: role,
            invited_by: invitedBy,
            invitation_token: invitationToken
          },
          redirectTo: invitationLink
        }
      );

      console.log('=== EMAIL RESPONSE ===');
      console.log('Auth data:', JSON.stringify(authData, null, 2));
      console.log('Auth error:', JSON.stringify(authError, null, 2));

      if (authError) {
        emailError = authError;
        console.error('❌ Email sending failed:', authError);
        console.error('Error details:', {
          message: authError.message,
          status: authError.status,
          statusText: authError.statusText
        });
        // Don't fail the whole process if email fails
        emailSent = false;
      } else {
        emailSent = true;
        console.log('✅ Invitation email sent successfully!');
        console.log('Email data:', authData);
      }
    } catch (emailException) {
      emailError = emailException;
      console.error('❌ Email sending exception:', emailException);
      console.error('Exception details:', {
        name: emailException.name,
        message: emailException.message,
        stack: emailException.stack
      });
      // Don't fail the whole process if email fails
      emailSent = false;
    }

    console.log('=== EMAIL SUMMARY ===');
    console.log('Email sent:', emailSent);
    console.log('Email error:', emailError ? emailError.message : 'None');

    console.log('Invitation created successfully:', {
      email,
      role,
      invitationLink
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: existing ? `Invitation resent to ${email}` : `Invitation created for ${email}`,
        emailSent: emailSent,
        emailError: emailError ? emailError.message : null,
        invitation: {
          email,
          role,
          status: 'pending',
          expires_at: invitation.expires_at,
          invitationLink
        }
      })
    };

  } catch (error) {
    console.error('Error sending invitation:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    console.error('Error JSON:', JSON.stringify(error, null, 2));

    // Extract error message from various possible formats
    let errorMessage = 'Unknown error';
    let errorDetails = 'No details available';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || error.message;
    } else if (error && typeof error === 'object') {
      // Handle Supabase error objects
      errorMessage = error.message || error.error_description || error.error || 'Database error';
      errorDetails = JSON.stringify(error, null, 2);

      // Log specific properties we might find
      console.error('Error properties:', {
        message: error.message,
        error: error.error,
        error_description: error.error_description,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      errorMessage = String(error);
      errorDetails = String(error);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        details: errorDetails,
        rawError: typeof error === 'object' ? JSON.stringify(error) : String(error)
      })
    };
  }
};