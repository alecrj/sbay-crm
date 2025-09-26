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
            <h1>Invalid Cancellation Link</h1>
            <p class="error">This cancellation link is invalid or malformed.</p>
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

      if (action !== 'cancel') {
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
            <h1>Invalid Cancellation Token</h1>
            <p class="error">This cancellation link is invalid or has been tampered with.</p>
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
      .eq('cancel_token', token)
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
            <h1>Cancellation Link Expired</h1>
            <p class="error">This cancellation link has expired or is no longer valid.</p>
            <p>Please contact us at <a href="tel:+19549379667">(954) 937-9667</a> to cancel your appointment.</p>
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
          email
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
            <p class="error">The appointment associated with this cancellation link could not be found.</p>
            <p>Please contact us at <a href="tel:+19549379667">(954) 937-9667</a> for assistance.</p>
          </body>
        </html>
      `, {
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Check if appointment is already cancelled
    if (appointment.status === 'cancelled') {
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

      return new NextResponse(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Already Cancelled</title>
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
              .info { color: #f59e0b; font-size: 48px; margin-bottom: 20px; }
              .title { color: #1e3a8a; margin-bottom: 20px; font-size: 28px; }
              .contact-info { margin-top: 30px; color: #6b7280; }
              a { color: #1e3a8a; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="info">ℹ️</div>
              <h1 class="title">Appointment Already Cancelled</h1>
              <p>This appointment has already been cancelled.</p>
              <p><strong>Original appointment:</strong> ${formatDateTime(appointment.start_time)}</p>

              <div class="contact-info">
                <p><strong>Need to schedule a new appointment?</strong></p>
                <p>Contact us at <a href="tel:+19549379667">(954) 937-9667</a></p>
                <p><strong>Shallow Bay Advisors</strong><br>Commercial Real Estate Experts</p>
              </div>
            </div>
          </body>
        </html>
      `, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Update appointment status to cancelled
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      throw updateError;
    }

    // Log the cancellation activity
    await supabase
      .from('lead_activities')
      .insert([{
        lead_id: appointment.leads.id,
        activity_type: 'note',
        title: 'Appointment cancelled',
        description: `${appointment.leads.name} cancelled their appointment via email link`,
        metadata: {
          appointment_id: appointmentId,
          cancelled_at: new Date().toISOString(),
          cancellation_method: 'email_link'
        }
      }]);

    // Invalidate all tokens for this appointment
    await supabase
      .from('appointment_tokens')
      .update({
        confirm_token: null,
        reschedule_token: null,
        cancel_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('appointment_id', appointmentId);

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

    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Appointment Cancelled</title>
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
            .cancelled { color: #ef4444; font-size: 48px; margin-bottom: 20px; }
            .title { color: #1e3a8a; margin-bottom: 20px; font-size: 28px; }
            .appointment-details {
              background-color: #fef2f2;
              border: 1px solid #fecaca;
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
            a { color: #1e3a8a; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="cancelled">❌</div>
            <h1 class="title">Appointment Cancelled</h1>
            <p>Your appointment with Shallow Bay Advisors has been successfully cancelled.</p>

            <div class="appointment-details">
              <h3 style="margin-top: 0; color: #dc2626;">Cancelled Appointment:</h3>
              <p><strong>Title:</strong> ${appointment.title}</p>
              <p><strong>Date & Time:</strong> ${formatDateTime(appointment.start_time)}</p>
              ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
            </div>

            <p>We're sorry you had to cancel. We understand that schedules can change.</p>

            <div class="contact-info">
              <p><strong>Need to schedule a new appointment?</strong></p>
              <p>Contact us at <a href="tel:+19549379667">(954) 937-9667</a> and we'll be happy to find a time that works for you.</p>
              <p><strong>Shallow Bay Advisors</strong><br>Commercial Real Estate Experts</p>
            </div>
          </div>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Error cancelling appointment:', error);
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
          <h1>Error Cancelling Appointment</h1>
          <p class="error">An error occurred while cancelling your appointment.</p>
          <p>Please contact us at <a href="tel:+19549379667">(954) 937-9667</a> and we'll help you cancel your appointment.</p>
        </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}