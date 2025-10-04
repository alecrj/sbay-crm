import { NextRequest, NextResponse } from 'next/server';
import { processPendingNotifications } from '@/lib/notification-scheduler';
import { supabaseAdmin } from '@/lib/supabase';
import { NotificationConfig } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check for API key (optional security measure)
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.CRON_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get notification configuration from settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', [
        'notifications_email_enabled',
        'notifications_sms_enabled',
        'notifications_email_provider',
        'notifications_sms_provider',
        'notifications_from_email',
        'notifications_from_name'
      ]);

    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Convert settings to config object
    const config: NotificationConfig = {
      email: {
        enabled: false,
        provider: 'resend',
        fromEmail: 'noreply@shallowbayadvisors.com',
        fromName: 'Shallow Bay Advisors',
      },
      sms: {
        enabled: false,
        provider: 'twilio',
        fromNumber: '',
      },
    };

    settings?.forEach(setting => {
      const value = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;

      switch (setting.key) {
        case 'notifications_email_enabled':
          config.email!.enabled = value;
          break;
        case 'notifications_sms_enabled':
          config.sms!.enabled = value;
          break;
        case 'notifications_email_provider':
          config.email!.provider = value;
          break;
        case 'notifications_sms_provider':
          config.sms!.provider = value;
          break;
        case 'notifications_from_email':
          config.email!.fromEmail = value;
          break;
        case 'notifications_from_name':
          config.email!.fromName = value;
          break;
      }
    });

    // Add API keys from environment variables
    config.email!.apiKey = process.env.EMAIL_API_KEY;
    config.sms!.apiKey = process.env.SMS_API_KEY;
    config.sms!.apiSecret = process.env.SMS_API_SECRET;
    config.sms!.fromNumber = process.env.SMS_FROM_NUMBER || '';

    // Process pending notifications
    await processPendingNotifications(config);

    return NextResponse.json({
      success: true,
      message: 'Notifications processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing notifications:', error);
    return NextResponse.json({
      error: 'Failed to process notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get notification statistics
    const { data, error } = await supabaseAdmin
      .from('notification_queue')
      .select('status, scheduled_for, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      pending: 0,
      sent: 0,
      failed: 0,
      overdue: 0,
    };

    const now = new Date();

    data?.forEach(item => {
      stats[item.status as keyof typeof stats]++;

      if (item.status === 'pending' && new Date(item.scheduled_for) < now) {
        stats.overdue++;
      }
    });

    return NextResponse.json({
      stats,
      lastWeek: data?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json({
      error: 'Failed to fetch notification stats'
    }, { status: 500 });
  }
}