import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, leadData, adminEmail } = body;

    if (!type || !leadData) {
      return NextResponse.json(
        { error: 'Missing required fields: type, leadData' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'new_lead':
        if (!adminEmail) {
          return NextResponse.json(
            { error: 'Admin email is required for new lead notifications' },
            { status: 400 }
          );
        }

        result = await NotificationService.sendNewLeadNotifications(leadData, adminEmail);

        return NextResponse.json({
          success: true,
          message: 'Notifications sent successfully',
          adminSent: result.adminSent,
          leadSent: result.leadSent
        });

      case 'lead_confirmation':
        const leadSent = await NotificationService.sendLeadConfirmation(leadData);

        return NextResponse.json({
          success: true,
          message: 'Lead confirmation sent',
          leadSent
        });

      case 'admin_notification':
        if (!adminEmail) {
          return NextResponse.json(
            { error: 'Admin email is required' },
            { status: 400 }
          );
        }

        const adminSent = await NotificationService.sendNewLeadNotificationToAdmin(leadData, adminEmail);

        return NextResponse.json({
          success: true,
          message: 'Admin notification sent',
          adminSent
        });

      default:
        return NextResponse.json(
          { error: `Unknown notification type: ${type}` },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Error in notifications API:', error);
    return NextResponse.json(
      { error: 'Failed to process notification request', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const action = searchParams.get('action');

    if (action === 'retry') {
      const successCount = await NotificationService.retryFailedNotifications();
      return NextResponse.json({
        success: true,
        message: `Successfully retried ${successCount} failed notifications`
      });
    }

    if (leadId) {
      const notifications = await NotificationService.getNotificationsForLead(leadId);
      return NextResponse.json({
        success: true,
        notifications
      });
    }

    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    );
  }
}