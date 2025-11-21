"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PropertyCalendar {
  id: string;
  property_id: string;
  property_title: string;
  property_size: string;
  property_county: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CalendarAvailability {
  property_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const PropertyCalendarsOverview: React.FC = () => {
  const [properties, setProperties] = useState<PropertyCalendar[]>([]);
  const [availability, setAvailability] = useState<CalendarAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPropertyCalendars();
  }, []);

  const fetchPropertyCalendars = async () => {
    try {
      setLoading(true);

      // Fetch property calendars
      const { data: calendarsData, error: calendarsError } = await supabase
        .from('property_calendars')
        .select('*')
        .order('property_county', { ascending: true })
        .order('property_title', { ascending: true });

      if (calendarsError) throw calendarsError;

      // Fetch availability data
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('calendar_availability')
        .select('property_id, day_of_week, start_time, end_time, is_active')
        .eq('is_active', true);

      if (availabilityError) throw availabilityError;

      setProperties(calendarsData || []);
      setAvailability(availabilityData || []);
    } catch (err) {
      console.error('Error fetching property calendars:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calendars');
    } finally {
      setLoading(false);
    }
  };

  const deleteCalendar = async (calendarId: string) => {
    if (!confirm('Are you sure you want to delete this orphaned calendar? This action cannot be undone.')) {
      return;
    }

    setDeleting(prev => new Set(prev).add(calendarId));

    try {
      // Delete calendar availability first
      const { error: availabilityError } = await supabase
        .from('calendar_availability')
        .delete()
        .eq('property_id', properties.find(p => p.id === calendarId)?.property_id);

      if (availabilityError) {
        console.error('Error deleting availability:', availabilityError);
      }

      // Delete blocked dates
      const { error: blockedError } = await supabase
        .from('calendar_blocked_dates')
        .delete()
        .eq('property_id', properties.find(p => p.id === calendarId)?.property_id);

      if (blockedError) {
        console.error('Error deleting blocked dates:', blockedError);
      }

      // Delete the calendar itself
      const { error: calendarError } = await supabase
        .from('property_calendars')
        .delete()
        .eq('id', calendarId);

      if (calendarError) {
        throw calendarError;
      }

      // Update local state
      setProperties(prev => prev.filter(p => p.id !== calendarId));

    } catch (error: any) {
      console.error('Error deleting calendar:', error);
      alert('Failed to delete calendar: ' + error.message);
    } finally {
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(calendarId);
        return newSet;
      });
    }
  };

  const deleteAllCalendars = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${properties.length} calendars? This action cannot be undone.`)) {
      return;
    }

    // Mark all calendars as deleting
    setDeleting(new Set(properties.map(p => p.id)));

    try {
      // Get all property IDs
      const propertyIds = properties.map(p => p.property_id);

      // Delete all calendar availability
      const { error: availabilityError } = await supabase
        .from('calendar_availability')
        .delete()
        .in('property_id', propertyIds);

      if (availabilityError) {
        console.error('Error deleting availability:', availabilityError);
      }

      // Delete all blocked dates
      const { error: blockedError } = await supabase
        .from('calendar_blocked_dates')
        .delete()
        .in('property_id', propertyIds);

      if (blockedError) {
        console.error('Error deleting blocked dates:', blockedError);
      }

      // Delete all calendars
      const { error: calendarError } = await supabase
        .from('property_calendars')
        .delete()
        .in('id', properties.map(p => p.id));

      if (calendarError) {
        throw calendarError;
      }

      // Clear all properties from state
      setProperties([]);

    } catch (error: any) {
      console.error('Error deleting all calendars:', error);
      alert('Failed to delete calendars: ' + error.message);
    } finally {
      setDeleting(new Set());
    }
  };

  const getDaysOfWeek = () => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getPropertyAvailability = (propertyId: string) => {
    return availability.filter(a => a.property_id === propertyId);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getActiveSchedule = (propertyId: string) => {
    const propertyAvailability = getPropertyAvailability(propertyId);
    if (propertyAvailability.length === 0) return 'No schedule set';

    const activeDays = propertyAvailability.map(a => a.day_of_week).sort();
    const daysOfWeek = getDaysOfWeek();

    if (activeDays.length === 0) return 'No active days';

    // Get time range (assuming same time for all active days)
    const firstAvailability = propertyAvailability[0];
    const timeRange = `${formatTime(firstAvailability.start_time)} - ${formatTime(firstAvailability.end_time)}`;

    // Format active days
    const activeDayNames = activeDays.map(day => daysOfWeek[day]);
    let dayRange = '';

    if (activeDays.length === 5 && activeDays.every(day => day >= 1 && day <= 5)) {
      dayRange = 'Mon-Fri';
    } else if (activeDays.length === 7) {
      dayRange = 'Daily';
    } else {
      dayRange = activeDayNames.join(', ');
    }

    return `${dayRange}, ${timeRange}`;
  };

  const groupedProperties = properties.reduce((acc, property) => {
    const county = property.property_county;
    if (!acc[county]) {
      acc[county] = [];
    }
    acc[county].push(property);
    return acc;
  }, {} as Record<string, PropertyCalendar[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Calendars</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchPropertyCalendars}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Property Calendars
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage booking schedules and availability for each property
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {properties.length} properties configured
          </span>
          {properties.length > 0 && (
            <button
              onClick={deleteAllCalendars}
              disabled={deleting.size > 0}
              className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete All Calendars
            </button>
          )}
        </div>
      </div>

      {/* Properties by County */}
      {Object.entries(groupedProperties).map(([county, countyProperties]) => (
        <div key={county} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
            {county} County
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {countyProperties.map((property) => (
              <div
                key={property.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                        {property.property_title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {property.property_size}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      property.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {property.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Schedule Summary */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Schedule
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getActiveSchedule(property.property_id)}
                    </p>
                  </div>

                  {/* Available Days Visual */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Available Days
                    </p>
                    <div className="flex gap-1">
                      {getDaysOfWeek().map((day, index) => {
                        const isActive = getPropertyAvailability(property.property_id)
                          .some(a => a.day_of_week === index);
                        return (
                          <div
                            key={day}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              isActive
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                            }`}
                          >
                            {day[0]}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      href={`/property-calendars/${property.property_id}`}
                      className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Manage Calendar
                    </Link>
                    <button
                      onClick={() => deleteCalendar(property.id)}
                      disabled={deleting.has(property.id)}
                      className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Calendar"
                    >
                      {deleting.has(property.id) ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {properties.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Property Calendars Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Property calendars will appear here once you have properties configured.
          </p>
        </div>
      )}
    </div>
  );
};

export default PropertyCalendarsOverview;