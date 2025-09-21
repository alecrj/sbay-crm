import { NextRequest, NextResponse } from 'next/server';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getCalendarEvents } from '@/lib/google-calendar';
import { supabase } from '@/lib/supabase';
import { scheduleAppointmentReminders, updateAppointmentReminders, cancelAppointmentReminders } from '@/lib/notification-scheduler';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') ? new Date(searchParams.get('start')!) : undefined;
    const endDate = searchParams.get('end') ? new Date(searchParams.get('end')!) : undefined;

    const events = await getCalendarEvents(startDate, endDate);

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      leadId,
      title,
      description,
      startTime,
      endTime,
      location,
      attendees,
    } = data;

    // Create event in Google Calendar
    const googleEventId = await createCalendarEvent({
      summary: title,
      description: description,
      start: {
        dateTime: startTime,
        timeZone: 'America/New_York', // Adjust for your timezone
      },
      end: {
        dateTime: endTime,
        timeZone: 'America/New_York',
      },
      location: location,
      attendees: attendees?.map((email: string) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours
          { method: 'popup', minutes: 120 }, // 2 hours
        ],
      },
    });

    if (!googleEventId) {
      return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
    }

    // Save appointment in database
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([{
        lead_id: leadId,
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        location,
        attendees: attendees || [],
        google_calendar_event_id: googleEventId,
        status: 'scheduled',
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving appointment:', error);
      // Try to delete the Google Calendar event if database save failed
      await deleteCalendarEvent(googleEventId);
      return NextResponse.json({ error: 'Failed to save appointment' }, { status: 500 });
    }

    // Update lead with consultation information if provided
    if (leadId) {
      await supabase
        .from('leads')
        .update({
          consultation_date: new Date(startTime).toISOString().split('T')[0],
          consultation_time: new Date(startTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        })
        .eq('id', leadId);

      // Log activity
      await supabase
        .from('lead_activities')
        .insert([{
          lead_id: leadId,
          activity_type: 'meeting',
          title: 'Appointment scheduled',
          description: `Appointment "${title}" scheduled for ${new Date(startTime).toLocaleString()}`,
          metadata: { appointment_id: appointment.id, google_event_id: googleEventId }
        }]);

      // Schedule appointment reminders
      await scheduleAppointmentReminders(appointment.id, {
        title,
        start_time: startTime,
        end_time: endTime,
        location,
        attendees: attendees || [],
        lead_id: leadId,
      });
    }

    return NextResponse.json({ appointment, googleEventId });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      appointmentId,
      title,
      description,
      startTime,
      endTime,
      location,
      attendees,
    } = data;

    // Get appointment from database
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Update Google Calendar event
    const updated = await updateCalendarEvent(appointment.google_calendar_event_id, {
      summary: title,
      description: description,
      start: {
        dateTime: startTime,
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endTime,
        timeZone: 'America/New_York',
      },
      location: location,
      attendees: attendees?.map((email: string) => ({ email })),
    });

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update calendar event' }, { status: 500 });
    }

    // Update appointment in database
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        location,
        attendees: attendees || [],
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
    }

    // Log activity if lead is associated
    if (appointment.lead_id) {
      await supabase
        .from('lead_activities')
        .insert([{
          lead_id: appointment.lead_id,
          activity_type: 'meeting',
          title: 'Appointment updated',
          description: `Appointment "${title}" updated for ${new Date(startTime).toLocaleString()}`,
          metadata: { appointment_id: appointmentId }
        }]);
    }

    // Update appointment reminders
    await updateAppointmentReminders(appointmentId, {
      title,
      start_time: startTime,
      end_time: endTime,
      location,
      attendees: attendees || [],
      lead_id: appointment.lead_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('id');

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // Get appointment from database
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Delete from Google Calendar
    if (appointment.google_calendar_event_id) {
      await deleteCalendarEvent(appointment.google_calendar_event_id);
    }

    // Cancel scheduled reminders
    await cancelAppointmentReminders(appointmentId);

    // Delete appointment from database
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (deleteError) {
      console.error('Error deleting appointment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 });
    }

    // Log activity if lead is associated
    if (appointment.lead_id) {
      await supabase
        .from('lead_activities')
        .insert([{
          lead_id: appointment.lead_id,
          activity_type: 'meeting',
          title: 'Appointment cancelled',
          description: `Appointment "${appointment.title}" was cancelled`,
          metadata: { cancelled_appointment: appointment.title }
        }]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 });
  }
}