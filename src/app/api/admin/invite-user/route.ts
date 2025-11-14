import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to generate a secure temporary password
function generateTempPassword(): string {
  return '123456';
}

export async function POST(request: NextRequest) {
  try {
    // Get the current user's session to verify they're an admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - No auth token provided' },
        { status: 401 }
      );
    }

    // Verify the requesting user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Check if requesting user is admin
    const { data: requestingUserData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    if (userError || requestingUserData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, name, role } = body;

    // Validate input
    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, role' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'agent', 'assistant'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: admin, agent, or assistant' },
        { status: 400 }
      );
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Create user in auth.users
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        role,
        invited_by: requestingUser.id,
        invited_at: new Date().toISOString()
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: createError.message || 'Failed to create user' },
        { status: 400 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'User creation failed - no user returned' },
        { status: 500 }
      );
    }

    // Add user to the users table
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUser.user.id,
        email,
        name,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error inserting into users table:', insertError);
      // If users table insert fails, we should delete the auth user to keep things clean
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile: ' + insertError.message },
        { status: 500 }
      );
    }

    // Return success with user info and temporary password
    return NextResponse.json({
      success: true,
      message: 'User invited successfully',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        name,
        role
      },
      tempPassword
    });

  } catch (error) {
    console.error('Unexpected error in invite-user API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
