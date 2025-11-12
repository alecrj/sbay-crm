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

export async function DELETE(request: NextRequest) {
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

    // Get user ID from query params
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (userId === requestingUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete from users table first (will cascade due to ON DELETE CASCADE)
    const { error: deleteUserError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteUserError) {
      console.error('Error deleting from users table:', deleteUserError);
    }

    // Delete from auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      return NextResponse.json(
        { error: deleteAuthError.message || 'Failed to delete user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in delete-user API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
