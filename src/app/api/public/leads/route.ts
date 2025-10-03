import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Use service role client for admin access (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

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
      source = 'appointment_booking',
      appointment_type = 'consultation',
      ...otherData
    } = data;

    // Validate required fields
    if (!first_name || !last_name || !email || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { error: 'Missing required fields: first_name, last_name, email, appointmentDate, appointmentTime' },
        { status: 400 }
      );
    }

    // Create the lead
    const leadData = {
      name: `${first_name} ${last_name}`,
      email,
      phone,
      property_interest,
      source,
      status: 'new',
      type: 'consultation',
      priority: 'medium',
      ...otherData
    };

    const { data: leadResult, error: leadError } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      return NextResponse.json(
        { error: 'Failed to create lead', details: leadError.message },
        { status: 500 }
      );
    }

    // Create the appointment with proper datetime format
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    const appointmentEndTime = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    const appointmentData = {
      title: `${appointment_type} - ${first_name} ${last_name}`,
      start_time: appointmentDateTime.toISOString(),
      end_time: appointmentEndTime.toISOString(),
      lead_id: leadResult.id,
      status: 'scheduled',
      property_id: propertyId,
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
      await resend.emails.send({
        from: 'SBAY Real Estate <noreply@sbayrealestate.com>',
        to: [email],
        subject: 'Appointment Confirmation - SBAY Real Estate',
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
      await resend.emails.send({
        from: 'SBAY Real Estate <noreply@sbayrealestate.com>',
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
          activity_type: 'appointment_booking',
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

    return NextResponse.json({
      success: true,
      lead: leadResult,
      appointment: appointmentResult
    });

  } catch (error) {
    console.error('Error processing appointment booking:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
