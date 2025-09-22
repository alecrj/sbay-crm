import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // For now, allow direct access - we'll add proper auth later
    // In production, you'd verify the admin user is authenticated

    const { email, name, role = 'agent' } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['admin', 'agent', 'assistant'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Create user with temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + '!A1';

    const { data: newUser, error: createError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Add to users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: newUser.user.id,
        email,
        name,
        role,
      });

    if (insertError) {
      console.error('Error inserting user profile:', insertError);
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
    }

    // TODO: Send invitation email with login instructions
    // For now, return the temporary password

    return NextResponse.json({
      success: true,
      message: 'User invited successfully',
      user: {
        id: newUser.user.id,
        email,
        name,
        role,
      },
      tempPassword, // In production, this should be sent via email
    });

  } catch (error) {
    console.error('Error in invite-user API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}