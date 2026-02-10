import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client to run database migrations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting database migration to update lead statuses...');

    // 1. Update existing leads with old statuses to new statuses
    console.log('Step 1: Migrating existing lead statuses...');

    // Update tour-scheduled to contacted
    const { error: updateContactedError } = await supabase
      .from('leads')
      .update({ status: 'contacted' })
      .eq('status', 'tour-scheduled');

    if (updateContactedError) {
      console.log('Note: Could not update tour-scheduled leads:', updateContactedError.message);
    }

    // Update canceled-no-show to no-reply
    const { error: updateNoReplyError } = await supabase
      .from('leads')
      .update({ status: 'no-reply' })
      .eq('status', 'canceled-no-show');

    if (updateNoReplyError) {
      console.log('Note: Could not update canceled-no-show leads:', updateNoReplyError.message);
    }

    // 2. Drop the existing status constraint
    console.log('Step 2: Dropping existing status constraint...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;'
    });

    if (dropError && !dropError.message.includes('does not exist')) {
      console.error('Error dropping constraint:', dropError);
      throw dropError;
    }

    // 3. Add the new status constraint with updated values
    console.log('Step 3: Adding new status constraint...');
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE leads ADD CONSTRAINT leads_status_check
            CHECK (status IN ('new', 'contacted', 'no-reply', 'showing-completed', 'won', 'lost'));`
    });

    if (addError) {
      console.error('Error adding new constraint:', addError);
      throw addError;
    }

    // 4. Drop and recreate the RLS policy
    console.log('Step 4: Updating RLS policy...');
    const { error: dropPolicyError } = await supabase.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "Leads are viewable by assigned user or admins" ON leads;'
    });

    if (dropPolicyError) {
      console.error('Error dropping RLS policy:', dropPolicyError);
      throw dropPolicyError;
    }

    const { error: createPolicyError } = await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Leads are viewable by assigned user or admins" ON leads
            FOR SELECT USING (assigned_to = auth.uid() OR assigned_to IS NULL OR
            EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));`
    });

    if (createPolicyError) {
      console.error('Error creating new RLS policy:', createPolicyError);
      throw createPolicyError;
    }

    // 5. Verify the changes by counting leads
    console.log('Step 5: Verifying migration...');
    const { data: leadCount, error: countError } = await supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('status', 'new');

    if (countError) {
      console.error('Error verifying migration:', countError);
      throw countError;
    }

    console.log('✅ Migration completed successfully!');
    console.log(`Found ${leadCount?.length || 0} leads with 'new' status`);

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      leadsWithNewStatus: leadCount?.length || 0,
      steps: [
        'Migrated existing leads from old statuses (tour-scheduled → contacted, canceled-no-show → no-reply)',
        'Dropped old status constraint',
        'Added new status constraint (new, contacted, no-reply, showing-completed, won, lost)',
        'Updated RLS policy to allow viewing unassigned leads',
        'Verified migration'
      ]
    });

  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}