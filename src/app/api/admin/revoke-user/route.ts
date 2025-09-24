import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(request: NextRequest) {
  try {
    const { email, invitationId } = await request.json();

    if (!email || !invitationId) {
      return NextResponse.json(
        { error: 'Email and invitation ID are required' },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      message: `Access revoked for ${email}`,
      userDeleted: !!authUser
    });

  } catch (error) {
    console.error('Error revoking user access:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to revoke access',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}