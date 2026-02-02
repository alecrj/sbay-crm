import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createCalendarEvent } from '@/lib/google-calendar';
import { scheduleAppointmentReminders } from '@/lib/notification-scheduler';
import { NotificationService } from '@/lib/notifications';

// CORS headers for cross-origin requests from the public website
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_WEBSITE_URL || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key if provided
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.PUBLIC_API_KEY;

    if (expectedApiKey && apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401, headers: corsHeaders }
      );
    }

    const data = await request.json();

    // Validate required fields
    const { name, email, appointmentDate, appointmentTime, propertyId } = data;
    if (!name || !email || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { error: 'Name, email, appointment date, and time are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse and validate appointment datetime
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    if (isNaN(appointmentDateTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid appointment date or time' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if appointment is in the future
    if (appointmentDateTime <= new Date()) {
      return NextResponse.json(
        { error: 'Appointment must be scheduled for a future date and time' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create appointment end time (default 1 hour duration)
    const duration = data.duration || 60; // minutes
    const endDateTime = new Date(appointmentDateTime.getTime() + duration * 60 * 1000);

    // Determine property and unit IDs for multi-unit buildings
    let calendarPropertyId = propertyId;
    let unitId = null;

    if (propertyId) {
      // Check if this is a unit in a multi-unit building
      const { data: property } = await supabase
        .from('properties')
        .select('id, parent_property_id')
        .eq('id', propertyId)
        .single();

      console.log('🏢 Property lookup for booking:', {
        propertyId,
        hasParent: !!property?.parent_property_id,
        parentId: property?.parent_property_id
      });

      if (property && property.parent_property_id) {
        // This is a unit - use parent building for calendar, store unit separately
        calendarPropertyId = property.parent_property_id;
        unitId = propertyId;
        console.log('✅ Unit detected - using parent building calendar:', {
          unitId,
          parentBuildingId: calendarPropertyId
        });
      } else {
        console.log('📍 Standalone property - using its own calendar');
      }

      // NOTE: Availability checking has been removed - all time slots are now bookable.
      // Appointments are treated as requests that will be confirmed by the team.
    }

    // Extract appointment data
    const appointmentData = {
      title: String(data.title || `Consultation - ${name}`).trim(),
      description: String(data.message || data.notes || '').trim() || null,
      start_time: appointmentDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      location: String(data.location || 'Office Meeting').trim(),
      attendees: [email],
      status: 'scheduled' as const,
    };

    // Find or create lead for this email
    let leadId: string | null = null;

    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .single();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      // Create new lead
      const leadData = {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: String(data.phone || '').trim() || null,
        company: String(data.company || '').trim() || null,
        property_interest: String(data.property_interest || data.propertyInterest || '').trim() || null,
        message: String(data.message || data.notes || '').trim() || null,
        title: `Appointment Request - ${name}`,
        type: 'consultation' as const,
        status: 'new' as const,
        priority: 'medium' as const,
        source: 'website' as const,
        consultation_date: appointmentDate,
        consultation_time: appointmentTime,
      };

      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single();

      if (leadError) {
        console.error('Error creating lead for appointment:', leadError);
        return NextResponse.json(
          { error: 'Failed to create lead for appointment' },
          { status: 500, headers: corsHeaders }
        );
      }

      leadId = newLead.id;

      // Log lead creation activity
      await supabase
        .from('lead_activities')
        .insert([{
          lead_id: leadId,
          activity_type: 'note',
          title: 'Lead created from appointment booking',
          description: `New lead created from website appointment booking`,
          metadata: { source: 'website-appointment', appointment_date: appointmentDate, appointment_time: appointmentTime }
        }]);
    }

    // Create event in Google Calendar first
    const googleEventId = await createCalendarEvent({
      summary: appointmentData.title,
      description: appointmentData.description,
      start: {
        dateTime: appointmentData.start_time,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: appointmentData.end_time,
        timeZone: 'America/New_York',
      },
      location: appointmentData.location,
      attendees: appointmentData.attendees.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours
          { method: 'popup', minutes: 120 }, // 2 hours
        ],
      },
    });

    if (!googleEventId) {
      return NextResponse.json(
        { error: 'Failed to create calendar event. Please try again.' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Save appointment in database
    // For multi-unit buildings: property_id = parent building, unit_id = specific unit
    // For single properties: property_id = property, unit_id = null
    console.log('💾 Saving appointment with:', {
      property_id: calendarPropertyId,
      unit_id: unitId,
      start_time: appointmentData.start_time
    });

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert([{
        lead_id: leadId,
        property_id: calendarPropertyId || null,
        unit_id: unitId,
        title: appointmentData.title,
        description: appointmentData.description,
        start_time: appointmentData.start_time,
        end_time: appointmentData.end_time,
        location: appointmentData.location,
        attendees: appointmentData.attendees,
        google_calendar_event_id: googleEventId,
        status: appointmentData.status,
      }])
      .select()
      .single();

    console.log('✅ Appointment saved:', appointment?.id);

    if (appointmentError) {
      console.error('Error saving appointment:', appointmentError);
      // Try to delete the Google Calendar event if database save failed
      try {
        const { deleteCalendarEvent } = await import('@/lib/google-calendar');
        await deleteCalendarEvent(googleEventId);
      } catch (deleteError) {
        console.error('Failed to cleanup Google Calendar event:', deleteError);
      }
      return NextResponse.json(
        { error: 'Failed to save appointment. Please try again.' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Update lead with consultation information
    // Store the specific unit (if multi-unit) or property they're interested in
    if (leadId) {
      await supabase
        .from('leads')
        .update({
          consultation_date: appointmentDate,
          consultation_time: appointmentTime,
          property_id: unitId || calendarPropertyId || null, // Store the specific unit if available
          status: 'tour-scheduled', // Move to tour-scheduled since they booked an appointment
        })
        .eq('id', leadId);

      // Log appointment scheduling activity
      await supabase
        .from('lead_activities')
        .insert([{
          lead_id: leadId,
          activity_type: 'meeting',
          title: 'Appointment scheduled',
          description: `Appointment "${appointmentData.title}" scheduled for ${appointmentDateTime.toLocaleString()}`,
          metadata: { appointment_id: appointment.id, google_event_id: googleEventId, source: 'website' }
        }]);
    }

    // Schedule appointment reminders
    try {
      await scheduleAppointmentReminders(appointment.id, {
        title: appointmentData.title,
        start_time: appointmentData.start_time,
        end_time: appointmentData.end_time,
        location: appointmentData.location,
        attendees: appointmentData.attendees,
        lead_id: leadId,
      });
    } catch (reminderError) {
      console.error('Failed to schedule appointment reminders:', reminderError);
      // Don't fail the appointment creation for reminder errors
    }

    // Send immediate notification to admin about new appointment request
    try {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'info@shallowbayadvisors.com';

      // Get property name if a property was selected
      let propertyName = 'Not specified';
      const propertyIdToLookup = unitId || calendarPropertyId;
      if (propertyIdToLookup) {
        const { data: propertyData } = await supabase
          .from('properties')
          .select('name, address')
          .eq('id', propertyIdToLookup)
          .single();
        if (propertyData) {
          propertyName = propertyData.name || propertyData.address || 'Property';
        }
      }

      const appointmentDateFormatted = appointmentDateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const appointmentTimeFormatted = appointmentDateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const subject = `🗓️ New Tour Request: ${name} - ${appointmentDateFormatted}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3B82F6, #1E40AF); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0;">🗓️ New Tour Request</h1>
          </div>
          <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; color: #1F2937;">Contact Information</h2>
              <p><strong>👤 Name:</strong> ${name}</p>
              <p><strong>📧 Email:</strong> <a href="mailto:${email}">${email}</a></p>
              ${data.phone ? `<p><strong>📱 Phone:</strong> <a href="tel:${data.phone}">${data.phone}</a></p>` : ''}
              ${data.company ? `<p><strong>🏢 Company:</strong> ${data.company}</p>` : ''}
            </div>
            <div style="background: #EFF6FF; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
              <h2 style="margin-top: 0; color: #1E40AF;">Requested Appointment</h2>
              <p><strong>📅 Date:</strong> ${appointmentDateFormatted}</p>
              <p><strong>🕐 Time:</strong> ${appointmentTimeFormatted}</p>
              <p><strong>🏠 Property:</strong> ${propertyName}</p>
              ${data.message ? `<p><strong>💬 Message:</strong> ${data.message}</p>` : ''}
            </div>
            <p style="color: #6B7280; font-size: 14px; margin-top: 20px;">
              This is a tour request. Please reach out to the client to confirm the appointment time.
            </p>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sbaycrm.netlify.app'}/appointments"
                 style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                View in CRM →
              </a>
            </div>
          </div>
        </div>
      `;
      const text = `New Tour Request

Contact Information:
- Name: ${name}
- Email: ${email}
${data.phone ? `- Phone: ${data.phone}\n` : ''}${data.company ? `- Company: ${data.company}\n` : ''}
Requested Appointment:
- Date: ${appointmentDateFormatted}
- Time: ${appointmentTimeFormatted}
- Property: ${propertyName}
${data.message ? `- Message: ${data.message}\n` : ''}
This is a tour request. Please reach out to the client to confirm the appointment time.

View in CRM: ${process.env.NEXT_PUBLIC_APP_URL || 'https://sbaycrm.netlify.app'}/appointments`;

      await NotificationService.sendEmail(adminEmail, subject, html, text);
      console.log(`✉️ Sent immediate appointment notification to ${adminEmail}`);
    } catch (notificationError) {
      console.error('Failed to send immediate appointment notification:', notificationError);
      // Don't fail the appointment creation for notification errors
    }

    return NextResponse.json(
      {
        success: true,
        appointmentId: appointment.id,
        googleEventId: googleEventId,
        leadId: leadId,
        message: 'Appointment scheduled successfully',
        appointmentDetails: {
          title: appointmentData.title,
          date: appointmentDate,
          time: appointmentTime,
          location: appointmentData.location,
          duration: `${duration} minutes`,
        }
      },
      { status: 201, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error processing appointment booking:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process appointment booking'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}