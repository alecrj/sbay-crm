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

    // Check if email already has pending invitation
    const { data: existing } = await supabaseAdmin
      .from('invited_users')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'This email already has a pending invitation' })
      };
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
        message: `Invitation created for ${email}`,
        invitation: {
          email,
          role,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
          invitationLink
        }
      })
    };

  } catch (error) {
    console.error('Error sending invitation:', error);
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      toString: error?.toString?.()
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : `Failed to send invitation: ${String(error)}`,
        details: error instanceof Error ? error.stack : `Error type: ${typeof error}, Constructor: ${error?.constructor?.name}, String: ${String(error)}`,
        rawError: String(error)
      })
    };
  }
};