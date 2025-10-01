import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // First, let's just create the table with service role permissions
    const { error: createError } = await supabaseAdmin
      .from('internal_notifications')
      .select('id')
      .limit(1);

    // If table doesn't exist, create it
    if (createError && createError.code === '42P01') {
      console.log('Creating internal_notifications table...');

      // Create table using direct SQL query
      const { error } = await supabaseAdmin.rpc('sql', {
        query: `
          CREATE TABLE internal_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            lead_id UUID,
            appointment_id UUID,
            user_id UUID,
            metadata JSONB DEFAULT '{}',
            action_url TEXT
          );

          CREATE INDEX idx_internal_notifications_user_id ON internal_notifications(user_id);
          CREATE INDEX idx_internal_notifications_is_read ON internal_notifications(is_read);
          CREATE INDEX idx_internal_notifications_created_at ON internal_notifications(created_at);
          CREATE INDEX idx_internal_notifications_type ON internal_notifications(type);
        `
      });

      if (error) {
        console.error('Error creating table with rpc:', error);
        throw new Error(`Failed to create table: ${error.message}`);
      }
    }

    console.log('Table creation completed');

    return NextResponse.json({
      success: true,
      message: 'Internal notifications table created successfully'
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Failed to create internal notifications table',
      details: error.message
    }, { status: 500 });
  }
}