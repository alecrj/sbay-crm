const { createClient } = require('@supabase/supabase-js');

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

    console.log('Sending invitation to:', email, 'with role:', role);

    // Check if user already exists in auth system
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = listError ? null : authUsers.users.find(user => user.email === email);

    if (existingUser) {
      console.log('User already exists, sending password reset email');

      // Send password reset email for existing users (this actually sends the email)
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sbaycrm.netlify.app'}/login`
      });

      if (resetError) {
        console.error('❌ Password reset email failed:', resetError);
        throw resetError;
      } else {
        console.log('✅ Password reset email sent successfully');
      }

      // Update their role in user metadata
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          role: role,
          invited_by: invitedBy
        }
      });
    } else {
      console.log('New user, sending invitation');

      // Use standard Supabase invitation flow for new users
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sbaycrm.netlify.app'}/login`,
        data: {
          role: role,
          invited_by: invitedBy
        }
      });

      if (error) {
        console.error('❌ Invitation error:', error);
        throw error;
      } else {
        console.log('✅ New user invitation sent:', data?.user?.id || 'no user data returned');
      }
    }

    // Store/update invitation details in database for admin tracking
    const { error: dbError } = await supabaseAdmin
      .from('invited_users')
      .upsert({
        email,
        role,
        invited_by: invitedBy,
        status: 'pending',
        invited_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database error storing invitation:', dbError);
    } else {
      console.log('✅ Invitation stored in database');
    }

    console.log('✅ Invitation/reset sent successfully to:', email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: existingUser ?
          `Password reset sent to ${email} (existing user)` :
          `Invitation sent to ${email} (new user)`
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