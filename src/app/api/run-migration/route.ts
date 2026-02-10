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

    const results = {
      tourScheduledUpdated: 0,
      canceledNoShowUpdated: 0,
      errors: [] as string[],
    };

    // 1. Update existing leads with old statuses to new statuses
    console.log('Step 1: Migrating existing lead statuses...');

    // Update tour-scheduled to contacted
    const { data: contactedData, error: updateContactedError } = await supabase
      .from('leads')
      .update({ status: 'contacted' })
      .eq('status', 'tour-scheduled')
      .select();

    if (updateContactedError) {
      results.errors.push(`Could not update tour-scheduled leads: ${updateContactedError.message}`);
    } else {
      results.tourScheduledUpdated = contactedData?.length || 0;
    }

    // Update canceled-no-show to no-reply
    const { data: noReplyData, error: updateNoReplyError } = await supabase
      .from('leads')
      .update({ status: 'no-reply' })
      .eq('status', 'canceled-no-show')
      .select();

    if (updateNoReplyError) {
      results.errors.push(`Could not update canceled-no-show leads: ${updateNoReplyError.message}`);
    } else {
      results.canceledNoShowUpdated = noReplyData?.length || 0;
    }

    // 2. Verify the changes by counting leads
    console.log('Step 2: Verifying migration...');
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
      message: 'Lead status migration completed',
      results: {
        tourScheduledToContacted: results.tourScheduledUpdated,
        canceledNoShowToNoReply: results.canceledNoShowUpdated,
        leadsWithNewStatus: leadCount?.length || 0,
        errors: results.errors,
      },
      manualStepRequired: 'Run this SQL in Supabase SQL Editor to update the constraint: ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check; ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN (\'new\', \'contacted\', \'no-reply\', \'showing-completed\', \'won\', \'lost\'));'
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