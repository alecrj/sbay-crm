import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Link</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #ef4444; }
            </style>
          </head>
          <body>
            <h1>Invalid Reschedule Link</h1>
            <p class="error">This reschedule link is invalid or malformed.</p>
            <p>Please contact us at <a href="tel:+19549379667">(954) 937-9667</a> if you need assistance.</p>
          </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Decode token
    let appointmentId: string;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [id, action, timestamp] = decoded.split(':');

      if (action !== 'reschedule') {
        throw new Error('Invalid action');
      }

      appointmentId = id;
    } catch (error) {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Token</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #ef4444; }
            </style>
          </head>
          <body>
            <h1>Invalid Reschedule Token</h1>
            <p class="error">This reschedule link is invalid or has been tampered with.</p>
            <p>Please contact us at <a href="tel:+19549379667">(954) 937-9667</a> if you need assistance.</p>
          </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Verify token exists and is valid
    const { data: tokenData, error: tokenError } = await supabase
      .from('appointment_tokens')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('reschedule_token', token)
      .single();

    if (tokenError || !tokenData || new Date(tokenData.expires_at) < new Date()) {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Expired Link</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #ef4444; }
            </style>
          </head>
          <body>
            <h1>Reschedule Link Expired</h1>
            <p class="error">This reschedule link has expired or is no longer valid.</p>
            <p>Please contact us at <a href="tel:+19549379667">(954) 937-9667</a> to reschedule your appointment.</p>
          </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        leads (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Appointment Not Found</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #ef4444; }
            </style>
          </head>
          <body>
            <h1>Appointment Not Found</h1>
            <p class="error">The appointment associated with this reschedule link could not be found.</p>
            <p>Please contact us at <a href="tel:+19549379667">(954) 937-9667</a> for assistance.</p>
          </body>
        </html>
      `, {
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
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

    // Log the reschedule request activity
    await supabase
      .from('lead_activities')
      .insert([{
        lead_id: appointment.leads.id,
        activity_type: 'note',
        title: 'Reschedule requested',
        description: `${appointment.leads.name} requested to reschedule their appointment via email link`,
        metadata: {
          appointment_id: appointmentId,
          reschedule_requested_at: new Date().toISOString(),
          request_method: 'email_link',
          original_appointment_time: appointment.start_time
        }
      }]);

    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reschedule Appointment</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              text-align: center;
              background-color: #f9fafb;
            }
            .container {
              background-color: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .reschedule { color: #f59e0b; font-size: 48px; margin-bottom: 20px; }
            .title { color: #1e3a8a; margin-bottom: 20px; font-size: 28px; }
            .appointment-details {
              background-color: #fef3c7;
              border: 1px solid #fbbf24;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
              text-align: left;
            }
            .contact-info {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
            }
            .contact-button {
              background-color: #1e3a8a;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              display: inline-block;
              margin: 20px 0;
            }
            .contact-button:hover {
              background-color: #1e40af;
              text-decoration: none;
            }
            a { color: #1e3a8a; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="reschedule">📅</div>
            <h1 class="title">Reschedule Your Appointment</h1>
            <p>We understand that schedules can change. Let's find a new time that works for you.</p>

            <div class="appointment-details">
              <h3 style="margin-top: 0; color: #92400e;">Current Appointment:</h3>
              <p><strong>Title:</strong> ${appointment.title}</p>
              <p><strong>Date & Time:</strong> ${formatDateTime(appointment.start_time)}</p>
              ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
              ${appointment.description ? `<p><strong>Notes:</strong> ${appointment.description}</p>` : ''}
            </div>

            <p>To reschedule this appointment, please contact us directly and we'll find a time that works better for you.</p>

            <a href="tel:+19549379667" class="contact-button">📞 Call Us: (954) 937-9667</a>

            <div class="contact-info">
              <p><strong>Our office hours:</strong></p>
              <p>Monday - Friday: 9:00 AM - 6:00 PM<br>
              Saturday: 10:00 AM - 4:00 PM<br>
              Sunday: By appointment only</p>

              <p style="margin-top: 20px;">
                <strong>Prefer email?</strong><br>
                Reply to the original appointment email and let us know your preferred times.
              </p>

              <p style="margin-top: 20px;">
                <strong>Shallow Bay Advisors</strong><br>
                Commercial Real Estate Experts
              </p>
            </div>
          </div>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Error handling reschedule request:', error);
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #ef4444; }
          </style>
        </head>
        <body>
          <h1>Error Processing Reschedule Request</h1>
          <p class="error">An error occurred while processing your reschedule request.</p>
          <p>Please contact us at <a href="tel:+19549379667">(954) 937-9667</a> and we'll help you reschedule your appointment.</p>
        </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}