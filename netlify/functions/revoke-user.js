const { createClient } = require('@supabase/supabase-js');

// Create admin client for deleting users
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
    const { email, invitationId } = JSON.parse(event.body);

    if (!email || !invitationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and invitation ID are required' })
      };
    }

    console.log('=== REVOKING USER ACCESS ===');
    console.log('Email:', email);
    console.log('Invitation ID:', invitationId);

    const supabaseAdmin = createSupabaseAdmin();

    // First, find the user in auth.users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const authUser = authUsers.users.find(user => user.email === email);
    console.log('Found auth user:', !!authUser);

    if (authUser) {
      // Delete the user account from Supabase Auth
      console.log('Deleting user from Supabase Auth...');
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);

      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        throw deleteError;
      }
      console.log('✅ User deleted from Supabase Auth');
    }

    // Update invitation status to revoked
    console.log('Updating invitation status...');
    const { error: updateError } = await supabaseAdmin
      .from('invited_users')
      .update({
        status: 'revoked',
        accepted_at: null // Clear the accepted timestamp
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      throw updateError;
    }

    console.log('✅ User access revoked successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Access revoked for ${email}`,
        userDeleted: !!authUser
      })
    };

  } catch (error) {
    console.error('Error revoking user access:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to revoke access',
        details: error instanceof Error ? error.stack : String(error)
      })
    };
  }
};