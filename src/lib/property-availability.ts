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
 */
export async function checkPropertyAvailability(
  propertyId: string,
  startTime: Date,
  endTime: Date
): Promise<PropertyAvailability> {
  try {
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = startTime.getDay();

    // Check if the property has a calendar set up
    const { data: calendar, error: calendarError } = await supabaseAdmin
      .from('property_calendars')
      .select('id, is_active')
      .eq('property_id', propertyId)
      .single();

    if (calendarError || !calendar) {
      // If no calendar exists, default to allowing appointments
      // This maintains backward compatibility
      return { isAvailable: true };
    }

    if (!calendar.is_active) {
      return {
        isAvailable: false,
        reason: 'Property calendar is currently inactive'
      };
    }

    // Check if the date is blocked
    const appointmentDate = startTime.toISOString().split('T')[0];

    const { data: blockedDates, error: blockedError } = await supabaseAdmin
      .from('calendar_blocked_dates')
      .select('id')
      .eq('property_id', propertyId)
      .eq('blocked_date', appointmentDate);

    if (blockedError) {
      console.error('Error checking blocked dates:', blockedError);
      // On error, default to allowing the appointment
      return { isAvailable: true };
    }

    if (blockedDates && blockedDates.length > 0) {
      return {
        isAvailable: false,
        reason: 'This date is blocked for appointments'
      };
    }

    // Check business hours for this day of week
    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('calendar_availability')
      .select('start_time, end_time, is_active')
      .eq('property_id', propertyId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (availabilityError || !availability) {
      return {
        isAvailable: false,
        reason: 'No business hours set for this day'
      };
    }

    if (!availability.is_active) {
      return {
        isAvailable: false,
        reason: 'Property is closed on this day'
      };
    }

    // Parse business hours
    const businessStart = parseTimeToMinutes(availability.start_time);
    const businessEnd = parseTimeToMinutes(availability.end_time);

    // Convert appointment times to minutes since midnight
    const appointmentStart = startTime.getHours() * 60 + startTime.getMinutes();
    const appointmentEnd = endTime.getHours() * 60 + endTime.getMinutes();

    // Check if appointment falls within business hours
    if (appointmentStart < businessStart || appointmentEnd > businessEnd) {
      const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
      };

      return {
        isAvailable: false,
        reason: `Property is only available from ${formatTime(businessStart)} to ${formatTime(businessEnd)}`
      };
    }

    // Check for existing appointments at this time
    const { data: existingAppointments, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('property_id', propertyId)
      .gte('start_time', startTime.toISOString())
      .lt('end_time', endTime.toISOString())
      .not('status', 'eq', 'cancelled');

    if (appointmentError) {
      console.error('Error checking existing appointments:', appointmentError);
      // On error, default to allowing the appointment
      return { isAvailable: true };
    }

    if (existingAppointments && existingAppointments.length > 0) {
      return {
        isAvailable: false,
        reason: 'This time slot is already booked'
      };
    }

    return { isAvailable: true };

  } catch (error) {
    console.error('Error checking property availability:', error);
    // On error, default to allowing the appointment to maintain system stability
    return { isAvailable: true };
  }
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
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();

    // Get property calendar and business hours
    const { data: calendarData, error: calendarError } = await supabaseAdmin
      .from('property_calendars')
      .select('id, is_active')
      .eq('property_id', propertyId)
      .single();

    if (calendarError || !calendarData || !calendarData.is_active) {
      return [];
    }

    // Get availability for this day of week
    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('calendar_availability')
      .select('start_time, end_time, is_active')
      .eq('property_id', propertyId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (availabilityError || !availability || !availability.is_active) {
      return [];
    }

    // Check if date is blocked
    const { data: blockedDates } = await supabaseAdmin
      .from('calendar_blocked_dates')
      .select('id')
      .eq('property_id', propertyId)
      .eq('blocked_date', date);

    if (blockedDates && blockedDates.length > 0) {
      return [];
    }

    // Generate time slots
    const businessStart = parseTimeToMinutes(availability.start_time);
    const businessEnd = parseTimeToMinutes(availability.end_time);
    const slots: TimeSlot[] = [];

    // Get existing appointments for this date
    const nextDay = new Date(appointmentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const { data: existingAppointments } = await supabaseAdmin
      .from('appointments')
      .select('start_time, end_time')
      .eq('property_id', propertyId)
      .gte('start_time', appointmentDate.toISOString())
      .lt('start_time', nextDay.toISOString())
      .not('status', 'eq', 'cancelled');

    // Generate 30-minute intervals
    // Work in UTC since appointments are stored in UTC
    for (let minutes = businessStart; minutes + duration <= businessEnd; minutes += 30) {
      const slotStart = new Date(appointmentDate);
      // Add EDT offset (4 hours) to convert business hours to UTC
      const utcHour = Math.floor(minutes / 60) + 4; // Business hours are in EDT, convert to UTC
      slotStart.setUTCHours(utcHour, minutes % 60, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + duration);

      // Check if this slot conflicts with existing appointments
      const hasConflict = existingAppointments?.some(apt => {
        const aptStart = new Date(apt.start_time);
        const aptEnd = new Date(apt.end_time);
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      if (!hasConflict) {
        slots.push({ start: slotStart, end: slotEnd });
      }
    }

    return slots;

  } catch (error) {
    console.error('Error getting available time slots:', error);
    return [];
  }
}