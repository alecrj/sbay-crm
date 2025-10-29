import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '@/lib/notifications';

// Use service role client for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const notificationService = new NotificationService();

// Verify this is being called by an authorized cron service
function isAuthorizedCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'your-secure-cron-secret';

  // Check for either Bearer token or basic cron secret
  return authHeader === `Bearer ${cronSecret}` ||
         request.headers.get('x-cron-secret') === cronSecret;
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is an authorized cron request
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Processing scheduled reminders...');

    // Get all due reminders from the database
    const { data: dueReminders, error: reminderError } = await supabase
      .rpc('process_due_reminders');

    if (reminderError) {
      console.error('Error fetching due reminders:', reminderError);
      throw reminderError;
    }

    if (!dueReminders || dueReminders.length === 0) {
      console.log('No reminders due for processing');
      return NextResponse.json({
        success: true,
        message: 'No reminders due for processing',
        processed: 0
      });
    }

    console.log(`Found ${dueReminders.length} reminders to process`);

    let processed = 0;
    let failed = 0;

    // Process each reminder
    for (const reminder of dueReminders) {
      try {
        console.log(`Processing ${reminder.reminder_type} reminder for appointment ${reminder.appointment_id}`);

        await processReminder(reminder);
        processed++;

        // Mark as sent in database
        await supabase.rpc('mark_reminder_sent', {
          reminder_uuid: reminder.reminder_id
        });

        console.log(`Successfully sent ${reminder.reminder_type} reminder for ${reminder.lead_email}`);

      } catch (error) {
        console.error(`Failed to process reminder ${reminder.reminder_id}:`, error);
        failed++;

        // Mark as failed in database
        await supabase.rpc('mark_reminder_failed', {
          reminder_uuid: reminder.reminder_id,
          error_msg: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Add small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Reminder processing complete. Processed: ${processed}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      message: 'Reminders processed successfully',
      processed,
      failed,
      total: dueReminders.length
    });

  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      {
        error: 'Failed to process reminders',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function processReminder(reminder: any) {
  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  // Handle business notifications
  if (reminder.recipient_type === 'business') {
    return await processBusinessNotification(reminder, formatDateTime);
  }

  // Generate fresh confirmation links
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const confirmToken = Buffer.from(`${reminder.appointment_id}:confirm:${Date.now()}`).toString('base64');
  const rescheduleToken = Buffer.from(`${reminder.appointment_id}:reschedule:${Date.now()}`).toString('base64');
  const cancelToken = Buffer.from(`${reminder.appointment_id}:cancel:${Date.now()}`).toString('base64');

  const confirmLink = `${baseUrl}/api/appointments/confirm?token=${confirmToken}`;
  const rescheduleLink = `${baseUrl}/api/appointments/reschedule?token=${rescheduleToken}`;
  const cancelLink = `${baseUrl}/api/appointments/cancel?token=${cancelToken}`;

  // Update tokens in database
  await supabase
    .from('appointment_tokens')
    .upsert({
      appointment_id: reminder.appointment_id,
      confirm_token: confirmToken,
      reschedule_token: rescheduleToken,
      cancel_token: cancelToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });

  let subject: string;
  let emailContent: string;

  switch (reminder.reminder_type) {
    case 'confirmation':
      subject = `Appointment Details - ${formatDate(reminder.appointment_start_time)}`;
      emailContent = getConfirmationEmailContent(reminder, confirmLink, rescheduleLink, cancelLink, formatDateTime);
      break;

    case '24_hour':
      subject = `Appointment Tomorrow - ${formatTime(reminder.appointment_start_time)}`;
      emailContent = get24HourReminderContent(reminder, confirmLink, rescheduleLink, formatDateTime);
      break;

    case '2_hour':
      subject = `Appointment Today - ${formatTime(reminder.appointment_start_time)}`;
      emailContent = get2HourReminderContent(reminder, confirmLink, rescheduleLink, formatDateTime);
      break;

    default:
      throw new Error(`Unknown reminder type: ${reminder.reminder_type}`);
  }

  // Send the email
  await notificationService.sendNotification({
    type: 'automated_appointment_reminder',
    data: {
      recipientEmail: reminder.lead_email,
      recipientName: reminder.lead_name,
      subject: subject,
      content: emailContent,
      appointmentId: reminder.appointment_id,
      reminderType: reminder.reminder_type
    }
  });

  // Log the activity
  await supabase
    .from('lead_activities')
    .insert([{
      lead_id: (await supabase
        .from('appointments')
        .select('lead_id')
        .eq('id', reminder.appointment_id)
        .single()).data?.lead_id,
      activity_type: 'email',
      title: `Automated ${reminder.reminder_type.replace('_', '-')} reminder sent`,
      description: `Automated ${reminder.reminder_type.replace('_', ' ')} reminder sent to ${reminder.lead_email}`,
      metadata: {
        email_type: reminder.reminder_type,
        appointment_id: reminder.appointment_id,
        automated: true,
        sent_at: new Date().toISOString()
      }
    }]);
}

async function processBusinessNotification(reminder: any, formatDateTime: Function) {
  let subject: string;
  let emailContent: string;
  const recipientEmail = reminder.business_email || '99alecrodriguez@gmail.com'; // Fallback to your email

  switch (reminder.reminder_type) {
    case 'business_cancellation':
      subject = `🚨 Appointment Cancelled - ${reminder.lead_name}`;
      emailContent = getBusinessCancellationContent(reminder, formatDateTime);
      break;

    case 'business_2_hour':
      subject = `⏰ Appointment in 2 Hours - ${reminder.lead_name}`;
      emailContent = getBusiness2HourContent(reminder, formatDateTime);
      break;

    default:
      throw new Error(`Unknown business reminder type: ${reminder.reminder_type}`);
  }

  // Send email to business owner
  await notificationService.sendNotification({
    type: 'business_notification',
    data: {
      recipientEmail: recipientEmail,
      recipientName: 'Shallow Bay Advisors Team',
      subject: subject,
      content: emailContent,
      appointmentId: reminder.appointment_id,
      reminderType: reminder.reminder_type
    }
  });

  // Log the business notification
  await supabase
    .from('lead_activities')
    .insert([{
      lead_id: (await supabase
        .from('appointments')
        .select('lead_id')
        .eq('id', reminder.appointment_id)
        .single()).data?.lead_id,
      activity_type: 'email',
      title: `Business notification: ${reminder.reminder_type.replace('business_', '')}`,
      description: `Business owner notified about ${reminder.reminder_type.replace('business_', '')} for ${reminder.lead_name}`,
      metadata: {
        email_type: reminder.reminder_type,
        appointment_id: reminder.appointment_id,
        automated: true,
        recipient: 'business_owner',
        sent_at: new Date().toISOString()
      }
    }]);
}

function getBusinessCancellationContent(reminder: any, formatDateTime: Function): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fef2f2;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border-left: 4px solid #ef4444;">
        <h2 style="color: #dc2626; margin-bottom: 20px;">🚨 Appointment Cancelled</h2>

        <p style="color: #374151; line-height: 1.6; font-size: 16px;">
          <strong>${reminder.lead_name}</strong> has cancelled their appointment.
        </p>

        <div style="background-color: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #fecaca;">
          <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px;">Cancelled Appointment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 120px;">Client:</td>
              <td style="padding: 8px 0; color: #374151;"><strong>${reminder.lead_name}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0; color: #374151;">${reminder.lead_email}</td>
            </tr>
            ${reminder.lead_phone ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Phone:</td>
              <td style="padding: 8px 0; color: #374151;">${reminder.lead_phone}</td>
            </tr>
            ` : ''}
            ${reminder.lead_company ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Company:</td>
              <td style="padding: 8px 0; color: #374151;">${reminder.lead_company}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Original Time:</td>
              <td style="padding: 8px 0; color: #374151;">${formatDateTime(reminder.appointment_start_time)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Subject:</td>
              <td style="padding: 8px 0; color: #374151;">${reminder.appointment_title}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9;">
          <p style="color: #0369a1; margin: 0; font-weight: 600;">
            💡 Next Steps: Consider following up with this lead to reschedule or understand their needs better.
          </p>
        </div>

        <div style="margin-top: 20px; text-align: center;">
          <a href="https://sbaycrm.netlify.app/leads" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            View Lead in CRM
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
          Shallow Bay Advisors CRM - Automated Notification
        </p>
      </div>
    </div>
  `;
}

function getBusiness2HourContent(reminder: any, formatDateTime: Function): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fef3c7;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border-left: 4px solid #f59e0b;">
        <h2 style="color: #92400e; margin-bottom: 20px;">⏰ Appointment Starting Soon</h2>

        <p style="color: #374151; line-height: 1.6; font-size: 16px;">
          Your appointment with <strong>${reminder.lead_name}</strong> is scheduled to begin in approximately <strong>2 hours</strong>.
        </p>

        <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #fbbf24;">
          <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Upcoming Appointment</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 120px;">Client:</td>
              <td style="padding: 8px 0; color: #374151;"><strong>${reminder.lead_name}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0; color: #374151;">${reminder.lead_email}</td>
            </tr>
            ${reminder.lead_phone ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Phone:</td>
              <td style="padding: 8px 0; color: #374151;"><a href="tel:${reminder.lead_phone}" style="color: #1e3a8a;">${reminder.lead_phone}</a></td>
            </tr>
            ` : ''}
            ${reminder.lead_company ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Company:</td>
              <td style="padding: 8px 0; color: #374151;">${reminder.lead_company}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Time:</td>
              <td style="padding: 8px 0; color: #374151;">${formatDateTime(reminder.appointment_start_time)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Subject:</td>
              <td style="padding: 8px 0; color: #374151;">${reminder.appointment_title}</td>
            </tr>
            ${reminder.appointment_location ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Location:</td>
              <td style="padding: 8px 0; color: #374151;">${reminder.appointment_location}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #0ea5e9;">
          <p style="color: #0369a1; margin: 0; font-weight: 600;">
            📋 Prep Time: Review the lead's information and prepare any materials for the meeting.
          </p>
        </div>

        <div style="margin-top: 20px; text-align: center;">
          <a href="https://sbaycrm.netlify.app/leads" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin: 0 10px;">
            View Lead Details
          </a>
          ${reminder.lead_phone ? `
          <a href="tel:${reminder.lead_phone}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; margin: 0 10px;">
            Call Client
          </a>
          ` : ''}
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
          Shallow Bay Advisors CRM - Automated Notification
        </p>
      </div>
    </div>
  `;
}

function getConfirmationEmailContent(reminder: any, confirmLink: string, rescheduleLink: string, cancelLink: string, formatDateTime: Function): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Shallow Bay Advisors</h1>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Commercial Real Estate Experts</p>
        </div>

        <h2 style="color: #374151; margin-bottom: 20px;">Your Appointment Details</h2>

        <p style="color: #374151; line-height: 1.6;">Dear ${reminder.lead_name},</p>

        <p style="color: #374151; line-height: 1.6;">
          Here are the details for your upcoming appointment with Shallow Bay Advisors. We're excited to discuss your commercial real estate needs.
        </p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Appointment Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 120px;">Title:</td>
              <td style="padding: 8px 0; color: #374151;">${reminder.appointment_title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Date & Time:</td>
              <td style="padding: 8px 0; color: #374151;">${formatDateTime(reminder.appointment_start_time)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Duration:</td>
              <td style="padding: 8px 0; color: #374151;">30 minutes</td>
            </tr>
            ${reminder.appointment_location ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Location:</td>
              <td style="padding: 8px 0; color: #374151;">${reminder.appointment_location}</td>
            </tr>
            ` : ''}
            ${reminder.appointment_description ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Notes:</td>
              <td style="padding: 8px 0; color: #374151;">${reminder.appointment_description}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${rescheduleLink}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px; display: inline-block;">
            📅 Reschedule
          </a>
          <a href="${cancelLink}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px; display: inline-block;">
            ✗ Cancel If Needed
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            <strong>We're looking forward to meeting with you!</strong><br>
            No need to confirm - just show up at the scheduled time. If you need to make any changes, use the buttons above or contact us at <a href="tel:+19549379667" style="color: #1e3a8a;">(954) 937-9667</a>
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            We look forward to meeting with you!<br>
            <strong>Shallow Bay Advisors Team</strong>
          </p>
        </div>
      </div>
    </div>
  `;
}

function get24HourReminderContent(reminder: any, confirmLink: string, rescheduleLink: string, formatDateTime: Function): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Shallow Bay Advisors</h1>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Commercial Real Estate Experts</p>
        </div>

        <h2 style="color: #374151; margin-bottom: 20px;">📅 Appointment Tomorrow</h2>

        <p style="color: #374151; line-height: 1.6;">Dear ${reminder.lead_name},</p>

        <p style="color: #374151; line-height: 1.6;">
          Just a friendly reminder that you have an appointment with Shallow Bay Advisors scheduled for
          <strong>tomorrow</strong>. We're looking forward to meeting with you!
        </p>

        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Tomorrow's Appointment</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #1e40af; font-weight: 600; width: 120px;">Title:</td>
              <td style="padding: 8px 0; color: #1f2937;">${reminder.appointment_title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">Date & Time:</td>
              <td style="padding: 8px 0; color: #1f2937;">${formatDateTime(reminder.appointment_start_time)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">Duration:</td>
              <td style="padding: 8px 0; color: #1f2937;">30 minutes</td>
            </tr>
            ${reminder.appointment_location ? `
            <tr>
              <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">Location:</td>
              <td style="padding: 8px 0; color: #1f2937;">${reminder.appointment_location}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <p style="color: #374151; line-height: 1.6;">
          We're looking forward to meeting with you to discuss your commercial real estate needs.
          Please let us know if you need to make any changes to this appointment.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${rescheduleLink}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px; display: inline-block;">
            📅 Need to Reschedule?
          </a>
          <a href="tel:+19549379667" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px; display: inline-block;">
            📞 Call Us
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            <strong>See you tomorrow!</strong><br>
            No confirmation needed - we'll see you at the scheduled time. Questions? Call us at <a href="tel:+19549379667" style="color: #1e3a8a;">(954) 937-9667</a>
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Best regards,<br>
            <strong>Shallow Bay Advisors Team</strong>
          </p>
        </div>
      </div>
    </div>
  `;
}

function get2HourReminderContent(reminder: any, confirmLink: string, rescheduleLink: string, formatDateTime: Function): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Shallow Bay Advisors</h1>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Commercial Real Estate Experts</p>
        </div>

        <h2 style="color: #374151; margin-bottom: 20px;">⏰ Appointment in 2 Hours</h2>

        <p style="color: #374151; line-height: 1.6;">Dear ${reminder.lead_name},</p>

        <p style="color: #374151; line-height: 1.6;">
          Your appointment with Shallow Bay Advisors is scheduled to begin in approximately
          <strong>2 hours</strong>. We're excited to meet with you!
        </p>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
          <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Upcoming Appointment</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #92400e; font-weight: 600; width: 120px;">Title:</td>
              <td style="padding: 8px 0; color: #1f2937;">${reminder.appointment_title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #92400e; font-weight: 600;">Date & Time:</td>
              <td style="padding: 8px 0; color: #1f2937;">${formatDateTime(reminder.appointment_start_time)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #92400e; font-weight: 600;">Duration:</td>
              <td style="padding: 8px 0; color: #1f2937;">30 minutes</td>
            </tr>
            ${reminder.appointment_location ? `
            <tr>
              <td style="padding: 8px 0; color: #92400e; font-weight: 600;">Location:</td>
              <td style="padding: 8px 0; color: #1f2937;">${reminder.appointment_location}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <p style="color: #374151; line-height: 1.6;">
          Please make sure you're prepared for our meeting. If you need to make any last-minute changes,
          please contact us immediately.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px; display: inline-block;">
            ✓ I'll Be There
          </a>
          <a href="tel:+19549379667" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px; display: inline-block;">
            📞 Call Us Now
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            <strong>Running late or need to reschedule?</strong><br>
            Please call us immediately at <a href="tel:+19549379667" style="color: #1e3a8a;">(954) 937-9667</a>
            so we can accommodate your needs.
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            See you soon!<br>
            <strong>Shallow Bay Advisors Team</strong>
          </p>
        </div>
      </div>
    </div>
  `;
}