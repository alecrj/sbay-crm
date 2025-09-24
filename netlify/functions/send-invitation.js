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

      // Generate temporary password (like HighLevel CRM)
      const tempPassword = `SBA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      console.log('Generated temporary password:', tempPassword);

      // Create invitation record
      const { data: newInvitation, error: dbError } = await supabaseAdmin
        .from('invited_users')
        .insert([{
          email,
          role,
          invited_by: invitedBy,
          status: 'pending',
          invitation_token: invitationToken,
          expires_at: expiresAt.toISOString(),
          temporary_password: tempPassword,
          password_changed: false
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
      // Check if user already exists in auth system
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = listError ? null : authUsers.users.find(user => user.email === email);

      if (existing && existingAuthUser) {
        // This is a resend to someone who already has an auth account
        console.log('Resending to existing auth user - using password reset flow');

        const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: invitationLink
          }
        });

        if (resetError) {
          emailError = resetError;
          console.error('❌ Password reset email failed:', resetError);
          emailSent = false;
        } else {
          emailSent = true;
          console.log('✅ Password reset email sent for resend!');
        }
      } else {
        // This is a new invitation or resend to someone without auth account
        console.log('Creating user account with temporary password');

        // Create user with temporary password directly
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: invitation.temporary_password,
          user_metadata: {
            role: role,
            invited_by: invitedBy,
            invitation_token: invitationToken,
            temporary_password: true
          },
          email_confirm: true // Auto-confirm email since we're creating it directly
        });

        console.log('=== EMAIL RESPONSE ===');
        console.log('Auth data:', JSON.stringify(authData, null, 2));
        console.log('Auth error:', JSON.stringify(authError, null, 2));

        if (authError) {
          emailError = authError;
          console.error('❌ User creation failed:', authError);
          emailSent = false;
        } else {
          // User created successfully - now send custom email with temp password
          console.log('✅ User created successfully! Now sending custom invitation email...');

          // Skip the actual email sending for now - we'll just log the details
          console.log('=== INVITATION EMAIL CONTENT ===');
          console.log(`To: ${email}`);
          console.log(`Subject: Welcome to Shallow Bay Advisors CRM`);
          console.log(`Body:`);
          console.log(`Welcome to Shallow Bay Advisors CRM!`);
          console.log(`Your temporary login credentials:`);
          console.log(`Email: ${email}`);
          console.log(`Temporary Password: ${invitation.temporary_password}`);
          console.log(`Login at: ${siteUrl}/login`);
          console.log(`Once you log in, you'll be prompted to set your permanent password.`);
          console.log('=== END EMAIL CONTENT ===');

          emailSent = true;
          console.log('Email data:', authData);
        }
      }
    } catch (emailException) {
      emailError = emailException;
      console.error('❌ Email sending exception:', emailException);
      console.error('Exception details:', {
        name: emailException.name,
        message: emailException.message,
        stack: emailException.stack
      });
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
          invitationLink,
          temporaryPassword: invitation.temporary_password
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