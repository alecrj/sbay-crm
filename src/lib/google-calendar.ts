import { google } from 'googleapis';

// Initialize Google Calendar API
const calendar = google.calendar('v3');

// Get OAuth2 client
export const getGoogleAuth = () => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google'
  );

  // Set credentials if available
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
    });
  }

  return auth;
};

// Calendar event interface
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

// Create a calendar event
export const createCalendarEvent = async (event: CalendarEvent): Promise<string | null> => {
  try {
    const auth = getGoogleAuth();

    const response = await calendar.events.insert({
      auth,
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        location: event.location,
        reminders: event.reminders || {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours
            { method: 'popup', minutes: 120 }, // 2 hours
          ],
        },
      },
    });

    return response.data.id || null;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
};

// Update a calendar event
export const updateCalendarEvent = async (eventId: string, event: Partial<CalendarEvent>): Promise<boolean> => {
  try {
    const auth = getGoogleAuth();

    await calendar.events.update({
      auth,
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: event.start,
        end: event.end,
        attendees: event.attendees,
        location: event.location,
        reminders: event.reminders,
      },
    });

    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
};

// Delete a calendar event
export const deleteCalendarEvent = async (eventId: string): Promise<boolean> => {
  try {
    const auth = getGoogleAuth();

    await calendar.events.delete({
      auth,
      calendarId: 'primary',
      eventId,
    });

    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
};

// Get calendar events
export const getCalendarEvents = async (
  startDate?: Date,
  endDate?: Date
): Promise<CalendarEvent[]> => {
  try {
    const auth = getGoogleAuth();

    const response = await calendar.events.list({
      auth,
      calendarId: 'primary',
      timeMin: startDate?.toISOString() || new Date().toISOString(),
      timeMax: endDate?.toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items?.map(item => ({
      id: item.id,
      summary: item.summary || '',
      description: item.description,
      start: {
        dateTime: item.start?.dateTime || item.start?.date || '',
        timeZone: item.start?.timeZone,
      },
      end: {
        dateTime: item.end?.dateTime || item.end?.date || '',
        timeZone: item.end?.timeZone,
      },
      attendees: item.attendees?.map(attendee => ({
        email: attendee.email || '',
        displayName: attendee.displayName,
      })),
      location: item.location,
    })) || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
};

// Check if a time slot is available
export const isTimeSlotAvailable = async (
  startTime: Date,
  endTime: Date
): Promise<boolean> => {
  try {
    const auth = getGoogleAuth();

    const response = await calendar.freebusy.query({
      auth,
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const busyTimes = response.data.calendars?.['primary']?.busy || [];
    return busyTimes.length === 0;
  } catch (error) {
    console.error('Error checking time slot availability:', error);
    return false;
  }
};

// Generate available time slots
export const getAvailableTimeSlots = async (
  date: Date,
  duration: number = 60, // minutes
  businessHours = { start: 9, end: 17 } // 9 AM to 5 PM
): Promise<Date[]> => {
  const slots: Date[] = [];
  const startOfDay = new Date(date);
  startOfDay.setHours(businessHours.start, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(businessHours.end, 0, 0, 0);

  for (let time = new Date(startOfDay); time < endOfDay; time.setMinutes(time.getMinutes() + duration)) {
    const slotEnd = new Date(time.getTime() + duration * 60000);

    if (await isTimeSlotAvailable(time, slotEnd)) {
      slots.push(new Date(time));
    }
  }

  return slots;
};