import { supabaseAdmin } from './supabase';

interface TimeSlot {
  start: Date;
  end: Date;
}

interface PropertyAvailability {
  isAvailable: boolean;
  reason?: string;
}

/**
 * Check if a time slot is available for a specific property
 *
 * NOTE: This function now always returns available=true to allow flexible booking.
 * Appointments are treated as requests that will be confirmed by the team.
 * The team will reach out to confirm or reschedule if there are conflicts.
 */
export async function checkPropertyAvailability(
  propertyId: string,
  startTime: Date,
  endTime: Date
): Promise<PropertyAvailability> {
  // Always allow booking - appointments are now treated as requests
  // The team will confirm or reschedule if needed
  return { isAvailable: true };
}

/**
 * Parse time string (HH:MM:SS) to minutes since midnight
 */
function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get available time slots for a property on a specific date
 */
export async function getAvailableTimeSlots(
  propertyId: string,
  date: string,
  duration: number = 30 // minutes
): Promise<TimeSlot[]> {
  try {
    // First, check if this is a unit in a multi-unit building
    // If so, use the parent building's calendar instead
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, parent_property_id')
      .eq('id', propertyId)
      .single();

    if (propertyError) {
      console.error('Error fetching property:', propertyError);
      return [];
    }

    // Use parent property ID for calendar if this is a unit
    const calendarPropertyId = property.parent_property_id || propertyId;

    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();

    // Get property calendar and business hours
    const { data: calendarData, error: calendarError } = await supabaseAdmin
      .from('property_calendars')
      .select('id, is_active')
      .eq('property_id', calendarPropertyId)
      .single();

    if (calendarError || !calendarData || !calendarData.is_active) {
      return [];
    }

    // Get availability for this day of week
    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('calendar_availability')
      .select('start_time, end_time, is_active')
      .eq('property_id', calendarPropertyId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (availabilityError || !availability || !availability.is_active) {
      return [];
    }

    // Check if date is blocked
    const { data: blockedDates } = await supabaseAdmin
      .from('calendar_blocked_dates')
      .select('id')
      .eq('property_id', calendarPropertyId)
      .eq('blocked_date', date);

    if (blockedDates && blockedDates.length > 0) {
      return [];
    }

    // Generate time slots
    const businessStart = parseTimeToMinutes(availability.start_time);
    const businessEnd = parseTimeToMinutes(availability.end_time);
    const slots: TimeSlot[] = [];

    // Generate 30-minute intervals for all business hours
    // No longer filtering out booked slots - all times are available for booking requests
    // Work in UTC since appointments are stored in UTC
    for (let minutes = businessStart; minutes + duration <= businessEnd; minutes += 30) {
      const slotStart = new Date(appointmentDate);
      // Add EDT offset (4 hours) to convert business hours to UTC
      const utcHour = Math.floor(minutes / 60) + 4; // Business hours are in EDT, convert to UTC
      slotStart.setUTCHours(utcHour, minutes % 60, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + duration);

      slots.push({ start: slotStart, end: slotEnd });
    }

    return slots;

  } catch (error) {
    console.error('Error getting available time slots:', error);
    return [];
  }
}