import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createCalendarEvent } from '@/lib/google-calendar';
import { scheduleAppointmentReminders } from '@/lib/notification-scheduler';
import { isTimeSlotAvailable } from '@/lib/google-calendar';
import { checkPropertyAvailability } from '@/lib/property-availability';

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

    // Check if time slot is available for the property
    if (propertyId) {
      const propertyAvailability = await checkPropertyAvailability(
        propertyId,
        appointmentDateTime,
        endDateTime
      );

      if (!propertyAvailability.isAvailable) {
        return NextResponse.json(
          { error: propertyAvailability.reason || 'The selected time slot is not available. Please choose a different time.' },
          { status: 409, headers: corsHeaders }
        );
      }
    } else {
      // Fallback to Google Calendar check for backward compatibility
      const isAvailable = await isTimeSlotAvailable(appointmentDateTime, endDateTime);
      if (!isAvailable) {
        return NextResponse.json(
          { error: 'The selected time slot is not available. Please choose a different time.' },
          { status: 409, headers: corsHeaders }
        );
      }
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
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert([{
        lead_id: leadId,
        property_id: propertyId || null,
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
    if (leadId) {
      await supabase
        .from('leads')
        .update({
          consultation_date: appointmentDate,
          consultation_time: appointmentTime,
          property_id: propertyId || null,
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