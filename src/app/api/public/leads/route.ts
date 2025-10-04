import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Use service role client for admin access (bypasses RLS) - Force deploy
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Extract appointment data
    const {
      first_name,
      last_name,
      email,
      phone,
      property_interest,
      propertyId,
      appointmentDate,
      appointmentTime,
      source = 'website',
      appointment_type = 'consultation',
      status,
      ...otherData
    } = data;

    // Validate required fields
    if (!first_name || !last_name || !email || !appointmentDate || !appointmentTime) {
      const validationResponse = NextResponse.json(
        { error: 'Missing required fields: first_name, last_name, email, appointmentDate, appointmentTime' },
        { status: 400 }
      );

      // Add CORS headers to validation error response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        validationResponse.headers.set(key, value);
      });

      return validationResponse;
    }

    // Create the lead data, filtering out all invalid/form-specific fields
    const {
      property_id: invalidPropertyId,
      propertyId: validPropertyId,
      appointment_date: formAppointmentDate,
      appointment_time: formAppointmentTime,
      appointmentDate: cleanAppointmentDate,
      appointmentTime: cleanAppointmentTime,
      appointment_type: cleanAppointmentType,
      ...cleanOtherData
    } = otherData;

    const leadData = {
      title: `${appointment_type} - ${first_name} ${last_name}`,
      name: `${first_name} ${last_name}`,
      email,
      phone,
      property_interest,
      source,
      status: status || 'new',
      type: 'consultation',
      ...cleanOtherData
    };

    const { data: leadResult, error: leadError } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      const leadErrorResponse = NextResponse.json(
        { error: 'Failed to create lead', details: leadError.message },
        { status: 500 }
      );

      // Add CORS headers to lead error response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        leadErrorResponse.headers.set(key, value);
      });

      return leadErrorResponse;
    }

    // Create the appointment with proper datetime format
    // Convert 12-hour format time to 24-hour format for proper Date parsing
    const convertTo24Hour = (time12h: string) => {
      const [time, modifier] = time12h.split(' ');
      let [hours, minutes] = time.split(':');
      if (hours === '12') {
        hours = '00';
      }
      if (modifier === 'PM') {
        hours = (parseInt(hours, 10) + 12).toString();
      }
      return `${hours.padStart(2, '0')}:${minutes}`;
    };

    const time24h = convertTo24Hour(appointmentTime);
    const appointmentDateTime = new Date(`${appointmentDate}T${time24h}`);
    const appointmentEndTime = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    const appointmentData = {
      title: `${appointment_type} - ${first_name} ${last_name}`,
      start_time: appointmentDateTime.toISOString(),
      end_time: appointmentEndTime.toISOString(),
      lead_id: leadResult.id,
      status: 'scheduled',
      description: property_interest || ''
    };

    const { data: appointmentResult, error: appointmentError } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      // Don't fail the entire request if appointment creation fails
    }

    // Send confirmation email to client
    try {
      console.log('Attempting to send client email to:', email);
      console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'Shallow Bay Advisors <onboarding@resend.dev>',
        to: [email],
        subject: 'Appointment Confirmation - Shallow Bay Advisors',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Appointment Confirmation</h2>
            <p>Dear ${first_name} ${last_name},</p>
            <p>Thank you for booking an appointment with SBAY Real Estate. Your appointment has been confirmed for:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${appointmentTime}</p>
              <p><strong>Type:</strong> ${appointment_type}</p>
              ${property_interest ? `<p><strong>Property:</strong> ${property_interest}</p>` : ''}
            </div>
            <p>We look forward to meeting with you. If you need to reschedule or have any questions, please contact us at (323) 810-7241.</p>
            <p>Best regards,<br>SBAY Real Estate Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending client email:', emailError);
    }

    // Send notification email to admin
    try {
      console.log('Attempting to send admin email to:', process.env.ADMIN_EMAIL);
      console.log('ADMIN_EMAIL exists:', !!process.env.ADMIN_EMAIL);

      await resend.emails.send({
        from: 'Shallow Bay Advisors <onboarding@resend.dev>',
        to: [process.env.ADMIN_EMAIL!],
        subject: 'New Appointment Booking',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">New Appointment Booking</h2>
            <p>A new appointment has been booked on your website:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Client:</strong> ${first_name} ${last_name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
              <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${appointmentTime}</p>
              <p><strong>Type:</strong> ${appointment_type}</p>
              ${property_interest ? `<p><strong>Property Interest:</strong> ${property_interest}</p>` : ''}
            </div>
            <p>Please check your CRM dashboard for more details.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending admin email:', emailError);
    }

    // Log activity
    if (leadResult.id) {
      await supabase
        .from('lead_activities')
        .insert([{
          lead_id: leadResult.id,
          activity_type: 'appointment_booked',
          title: 'Appointment booked',
          description: `Appointment scheduled for ${appointmentDate} at ${appointmentTime}`,
          metadata: {
            appointment_id: appointmentResult?.id,
            date: appointmentDate,
            time: appointmentTime,
            type: appointment_type
          }
        }]);
    }

    const response = NextResponse.json({
      success: true,
      lead: leadResult,
      appointment: appointmentResult
    });

    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Error processing appointment booking:', error);
    const errorResponse = NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );

    // Add CORS headers to error response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });

    return errorResponse;
  }
}
