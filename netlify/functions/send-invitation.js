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

    // Store invitation in database first
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
      throw new Error('Failed to store invitation in database');
    }

    // Send invitation email using Supabase auth
    const { error: emailError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sbaycrm.netlify.app'}/login`
    });

    if (emailError) {
      console.error('Email error:', emailError);
      throw new Error('Failed to send invitation email');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`
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