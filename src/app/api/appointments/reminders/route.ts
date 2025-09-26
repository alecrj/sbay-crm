import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '@/lib/notifications';

// Use service role client for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const notificationService = new NotificationService();

export async function POST(request: NextRequest) {
  try {
    const { appointmentId, type = 'reminder' } = await request.json();

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Fetch appointment with lead details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        leads (
          id,
          name,
          email,
          phone,
          company
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    if (!appointment.leads?.email) {
      return NextResponse.json(
        { error: 'No email address found for appointment' },
        { status: 400 }
      );
    }

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

    // Generate confirmation links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const confirmToken = Buffer.from(`${appointmentId}:confirm:${Date.now()}`).toString('base64');
    const rescheduleToken = Buffer.from(`${appointmentId}:reschedule:${Date.now()}`).toString('base64');
    const cancelToken = Buffer.from(`${appointmentId}:cancel:${Date.now()}`).toString('base64');

    const confirmLink = `${baseUrl}/api/appointments/confirm?token=${confirmToken}`;
    const rescheduleLink = `${baseUrl}/api/appointments/reschedule?token=${rescheduleToken}`;
    const cancelLink = `${baseUrl}/api/appointments/cancel?token=${cancelToken}`;

    // Store tokens in database for verification
    await supabase
      .from('appointment_tokens')
      .upsert({
        appointment_id: appointmentId,
        confirm_token: confirmToken,
        reschedule_token: rescheduleToken,
        cancel_token: cancelToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        updated_at: new Date().toISOString()
      });

    let subject: string;
    let emailContent: string;

    if (type === 'confirmation') {
      subject = `Appointment Confirmation - ${formatDate(appointment.start_time)}`;
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Shallow Bay Advisors</h1>
              <p style="color: #6b7280; margin: 5px 0 0 0;">Commercial Real Estate Experts</p>
            </div>

            <h2 style="color: #374151; margin-bottom: 20px;">Appointment Confirmed!</h2>

            <p style="color: #374151; line-height: 1.6;">Dear ${appointment.leads.name},</p>

            <p style="color: #374151; line-height: 1.6;">
              Thank you for scheduling an appointment with Shallow Bay Advisors. We're excited to discuss your commercial real estate needs.
            </p>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Appointment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 120px;">Title:</td>
                  <td style="padding: 8px 0; color: #374151;">${appointment.title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Date & Time:</td>
                  <td style="padding: 8px 0; color: #374151;">${formatDateTime(appointment.start_time)}</td>
                </tr>
                ${appointment.location ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Location:</td>
                  <td style="padding: 8px 0; color: #374151;">${appointment.location}</td>
                </tr>
                ` : ''}
                ${appointment.description ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Notes:</td>
                  <td style="padding: 8px 0; color: #374151;">${appointment.description}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px; display: inline-block;">
                ✓ Confirm Appointment
              </a>
              <a href="${rescheduleLink}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px; display: inline-block;">
                📅 Reschedule
              </a>
              <a href="${cancelLink}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px; display: inline-block;">
                ✗ Cancel
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>Need to make changes?</strong><br>
                You can confirm, reschedule, or cancel this appointment using the buttons above.
                If you have any questions, please contact us at <a href="tel:+19549379667" style="color: #1e3a8a;">(954) 937-9667</a>
                or reply to this email.
              </p>

              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                We look forward to meeting with you!<br>
                <strong>Shallow Bay Advisors Team</strong>
              </p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Reminder email
      const timeUntil = Math.ceil((new Date(appointment.start_time).getTime() - Date.now()) / (1000 * 60 * 60));
      subject = `Appointment Reminder - Tomorrow at ${formatTime(appointment.start_time)}`;

      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Shallow Bay Advisors</h1>
              <p style="color: #6b7280; margin: 5px 0 0 0;">Commercial Real Estate Experts</p>
            </div>

            <h2 style="color: #374151; margin-bottom: 20px;">📅 Appointment Reminder</h2>

            <p style="color: #374151; line-height: 1.6;">Dear ${appointment.leads.name},</p>

            <p style="color: #374151; line-height: 1.6;">
              This is a friendly reminder about your upcoming appointment with Shallow Bay Advisors scheduled for
              <strong>${timeUntil <= 24 ? 'tomorrow' : formatDate(appointment.start_time)}</strong>.
            </p>

            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">Appointment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #1e40af; font-weight: 600; width: 120px;">Title:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${appointment.title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">Date & Time:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${formatDateTime(appointment.start_time)}</td>
                </tr>
                ${appointment.location ? `
                <tr>
                  <td style="padding: 8px 0; color: #1e40af; font-weight: 600;">Location:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${appointment.location}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <p style="color: #374151; line-height: 1.6;">
              We're looking forward to meeting with you to discuss your commercial real estate needs.
              Please let us know if you need to make any changes to this appointment.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px; display: inline-block;">
                ✓ Confirm Attendance
              </a>
              <a href="${rescheduleLink}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px; display: inline-block;">
                📅 Reschedule
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                <strong>Questions or need to reschedule?</strong><br>
                Contact us at <a href="tel:+19549379667" style="color: #1e3a8a;">(954) 937-9667</a>
                or reply to this email. We're here to help!
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

    // Send the email
    await notificationService.sendNotification({
      type: 'new_appointment_reminder',
      data: {
        recipientEmail: appointment.leads.email,
        recipientName: appointment.leads.name,
        subject: subject,
        content: emailContent,
        appointmentId: appointmentId,
        leadId: appointment.leads.id
      }
    });

    // Log the reminder activity
    await supabase
      .from('lead_activities')
      .insert([{
        lead_id: appointment.leads.id,
        activity_type: 'email',
        title: `${type === 'confirmation' ? 'Confirmation' : 'Reminder'} email sent`,
        description: `${type === 'confirmation' ? 'Appointment confirmation' : 'Appointment reminder'} email sent to ${appointment.leads.email}`,
        metadata: {
          email_type: type,
          appointment_id: appointmentId,
          sent_at: new Date().toISOString()
        }
      }]);

    return NextResponse.json({
      success: true,
      message: `${type === 'confirmation' ? 'Confirmation' : 'Reminder'} email sent successfully`
    });

  } catch (error) {
    console.error('Error sending appointment reminder:', error);
    return NextResponse.json(
      { error: 'Failed to send reminder email' },
      { status: 500 }
    );
  }
}