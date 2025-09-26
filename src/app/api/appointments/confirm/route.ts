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
            <h1>Invalid Confirmation Link</h1>
            <p class="error">This confirmation link is invalid or malformed.</p>
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

      if (action !== 'confirm') {
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
            <h1>Invalid Confirmation Token</h1>
            <p class="error">This confirmation link is invalid or has been tampered with.</p>
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
      .eq('confirm_token', token)
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
            <h1>Confirmation Link Expired</h1>
            <p class="error">This confirmation link has expired or is no longer valid.</p>
            <p>Please contact us at <a href="tel:+19549379667">(954) 937-9667</a> to confirm your appointment.</p>
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
            <p class="error">The appointment associated with this confirmation link could not be found.</p>
            <p>Please contact us at <a href="tel:+19549379667">(954) 937-9667</a> for assistance.</p>
          </body>
        </html>
      `, {
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Update appointment status to confirmed
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      throw updateError;
    }

    // Log the confirmation activity
    await supabase
      .from('lead_activities')
      .insert([{
        lead_id: appointment.leads.id,
        activity_type: 'note',
        title: 'Appointment confirmed',
        description: `${appointment.leads.name} confirmed their appointment via email link`,
        metadata: {
          appointment_id: appointmentId,
          confirmed_at: new Date().toISOString(),
          confirmation_method: 'email_link'
        }
      }]);

    // Invalidate the token
    await supabase
      .from('appointment_tokens')
      .update({
        confirm_token: null,
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
          <title>Appointment Confirmed</title>
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
            .success { color: #10b981; font-size: 48px; margin-bottom: 20px; }
            .title { color: #1e3a8a; margin-bottom: 20px; font-size: 28px; }
            .appointment-details {
              background-color: #f3f4f6;
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
            <div class="success">✅</div>
            <h1 class="title">Appointment Confirmed!</h1>
            <p>Thank you for confirming your appointment with Shallow Bay Advisors.</p>

            <div class="appointment-details">
              <h3 style="margin-top: 0; color: #1f2937;">Appointment Details:</h3>
              <p><strong>Title:</strong> ${appointment.title}</p>
              <p><strong>Date & Time:</strong> ${formatDateTime(appointment.start_time)}</p>
              ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
              ${appointment.description ? `<p><strong>Notes:</strong> ${appointment.description}</p>` : ''}
            </div>

            <p>We're looking forward to meeting with you to discuss your commercial real estate needs.</p>

            <div class="contact-info">
              <p><strong>Questions or need to make changes?</strong></p>
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

  } catch (error) {
    console.error('Error confirming appointment:', error);
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
          <h1>Error Confirming Appointment</h1>
          <p class="error">An error occurred while confirming your appointment.</p>
          <p>Please contact us at <a href="tel:+19549379667">(954) 937-9667</a> and we'll help you confirm your appointment.</p>
        </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}