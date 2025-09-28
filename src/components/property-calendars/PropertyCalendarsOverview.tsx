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
                    <Link
                      href={`/property-calendars/${property.property_id}/appointments`}
                      className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </Link>
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