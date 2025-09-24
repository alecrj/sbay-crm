const { createClient } = require('@supabase/supabase-js');

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

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const supabaseAdmin = createSupabaseAdmin();
    const { email, role, invitedBy } = JSON.parse(event.body);

    if (!email || !role) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and role are required' })
      };
    }

    // Generate UUID for invitation token
    const { randomUUID } = require('crypto');
    const invitationToken = randomUUID();

    // Store invitation in database first
    const inviteData = {
      email,
      role,
      invited_by: invitedBy,
      status: 'pending',
      invitation_token: invitationToken,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    console.log('Attempting to insert invitation data:', inviteData);

    const { data: insertData, error: dbError } = await supabaseAdmin
      .from('invited_users')
      .upsert(inviteData);

    if (dbError) {
      console.error('Database error details:', {
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code,
        data: inviteData
      });
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('Invitation stored successfully:', insertData);

    // Check if user already exists in auth system
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = listError ? null : authUsers.users.find(user => user.email === email);

    if (existingUser) {
      console.log('User already exists, sending password reset instead');
      // Send password reset for existing users
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sbaycrm.netlify.app'}/login`
      });

      if (resetError) {
        console.error('Password reset error:', resetError);
        throw new Error('Failed to send password reset email');
      }
    } else {
      console.log('New user, sending invitation');
      // Send invitation email for new users
      const { data: inviteData, error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sbaycrm.netlify.app'}/login`,
        data: {
          role: role,
          invited_by: invitedBy
        }
      });

      if (emailError) {
        console.error('Invitation error:', emailError);
        throw new Error('Failed to send invitation email');
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: existingUser
          ? `Password reset sent to ${email} (existing user)`
          : `Invitation sent to ${email} (new user)`
      })
    };

  } catch (error) {
    console.error('Error sending invitation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to send invitation'
      })
    };
  }
};