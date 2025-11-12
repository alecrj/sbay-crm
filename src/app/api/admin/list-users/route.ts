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

export async function GET(request: NextRequest) {
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

    // List all users from both auth.users and users table
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing auth users:', listError);
      return NextResponse.json(
        { error: listError.message || 'Failed to list users' },
        { status: 500 }
      );
    }

    // Get user details from users table
    const { data: userDetails, error: detailsError } = await supabaseAdmin
      .from('users')
      .select('id, name, role, email');

    if (detailsError) {
      console.error('Error fetching user details:', detailsError);
    }

    // Merge the data
    const usersMap = new Map(userDetails?.map(u => [u.id, u]) || []);

    const users = authUsers.users.map(authUser => ({
      id: authUser.id,
      email: authUser.email,
      email_confirmed_at: authUser.email_confirmed_at,
      created_at: authUser.created_at,
      user_metadata: {
        full_name: usersMap.get(authUser.id)?.name || authUser.user_metadata?.name || '',
        role: usersMap.get(authUser.id)?.role || authUser.user_metadata?.role || 'agent'
      }
    }));

    return NextResponse.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Unexpected error in list-users API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
