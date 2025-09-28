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
  timezone: string;
  created_at: string;
  updated_at: string;
}

interface CalendarAvailability {
  id: string;
  property_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
}

interface PropertyCalendarManagerProps {
  propertyId: string;
}

const PropertyCalendarManager: React.FC<PropertyCalendarManagerProps> = ({ propertyId }) => {
  const [property, setProperty] = useState<PropertyCalendar | null>(null);
  const [availability, setAvailability] = useState<CalendarAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [businessHoursModal, setBusinessHoursModal] = useState(false);
  const [businessHours, setBusinessHours] = useState({
    startTime: '09:00',
    endTime: '17:00',
    days: [1, 2, 3, 4, 5] // Monday to Friday
  });

  useEffect(() => {
    fetchPropertyCalendar();
  }, [propertyId]);

  const fetchPropertyCalendar = async () => {
    try {
      setLoading(true);

      // Fetch property calendar details
      const { data: propertyData, error: propertyError } = await supabase
        .from('property_calendars')
        .select('*')
        .eq('property_id', propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Fetch availability data
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('calendar_availability')
        .select('*')
        .eq('property_id', propertyId)
        .order('day_of_week', { ascending: true });

      if (availabilityError) throw availabilityError;

      setProperty(propertyData);
      setAvailability(availabilityData || []);
    } catch (err) {
      console.error('Error fetching property calendar:', err);
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (dayOfWeek: number, startTime: string, endTime: string, isActive: boolean) => {
    try {
      setSaving(true);

      // Find existing availability for this day
      const existingAvailability = availability.find(a => a.day_of_week === dayOfWeek);

      if (existingAvailability) {
        // Update existing availability
        const { error } = await supabase
          .from('calendar_availability')
          .update({
            start_time: startTime,
            end_time: endTime,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAvailability.id);

        if (error) throw error;

        // Update local state
        setAvailability(prev => prev.map(a =>
          a.id === existingAvailability.id
            ? { ...a, start_time: startTime, end_time: endTime, is_active: isActive }
            : a
        ));
      } else {
        // Create new availability
        const { data, error } = await supabase
          .from('calendar_availability')
          .insert([{
            property_id: propertyId,
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            slot_duration: 30,
            is_active: isActive
          }])
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setAvailability(prev => [...prev, data]);
      }
    } catch (err) {
      console.error('Error updating availability:', err);
      alert('Failed to update availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDayAvailability = async (dayOfWeek: number) => {
    const existingAvailability = availability.find(a => a.day_of_week === dayOfWeek);
    const currentlyActive = existingAvailability?.is_active || false;
    const defaultStart = '09:00:00';
    const defaultEnd = '16:00:00';

    await updateAvailability(
      dayOfWeek,
      existingAvailability?.start_time || defaultStart,
      existingAvailability?.end_time || defaultEnd,
      !currentlyActive
    );
  };

  const updateTimeSlot = async (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
    const existingAvailability = availability.find(a => a.day_of_week === dayOfWeek);
    if (!existingAvailability) return;

    const startTime = field === 'start_time' ? `${value}:00` : existingAvailability.start_time;
    const endTime = field === 'end_time' ? `${value}:00` : existingAvailability.end_time;

    await updateAvailability(dayOfWeek, startTime, endTime, existingAvailability.is_active);
  };

  const getDaysOfWeek = () => [
    { name: 'Sunday', short: 'Sun', value: 0 },
    { name: 'Monday', short: 'Mon', value: 1 },
    { name: 'Tuesday', short: 'Tue', value: 2 },
    { name: 'Wednesday', short: 'Wed', value: 3 },
    { name: 'Thursday', short: 'Thu', value: 4 },
    { name: 'Friday', short: 'Fri', value: 5 },
    { name: 'Saturday', short: 'Sat', value: 6 }
  ];

  const formatTimeForInput = (time: string) => {
    return time.substring(0, 5); // Convert "09:00:00" to "09:00"
  };

  const getAvailabilityForDay = (dayOfWeek: number) => {
    return availability.find(a => a.day_of_week === dayOfWeek);
  };

  const applyBusinessHours = async () => {
    try {
      setSaving(true);

      // Apply business hours to selected days
      for (const day of businessHours.days) {
        await updateAvailability(day, `${businessHours.startTime}:00`, `${businessHours.endTime}:00`, true);
      }

      // Turn off other days
      const allDays = [0, 1, 2, 3, 4, 5, 6];
      const offDays = allDays.filter(day => !businessHours.days.includes(day));
      for (const day of offDays) {
        const existing = getAvailabilityForDay(day);
        if (existing) {
          await updateAvailability(day, existing.start_time, existing.end_time, false);
        }
      }

      setBusinessHoursModal(false);
    } catch (error) {
      console.error('Error applying business hours:', error);
      alert('Failed to apply business hours. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleBusinessDay = (dayValue: number) => {
    setBusinessHours(prev => ({
      ...prev,
      days: prev.days.includes(dayValue)
        ? prev.days.filter(d => d !== dayValue)
        : [...prev.days, dayValue].sort()
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Calendar</h3>
        <p className="text-red-600">{error || 'Property not found'}</p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={fetchPropertyCalendar}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
          <Link
            href="/property-calendars"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Calendars
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/property-calendars"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Calendar Management
            </h1>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {property.property_title}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {property.property_size} • {property.property_county} County
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            property.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
            {property.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Weekly Schedule
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Set available hours for each day of the week
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {getDaysOfWeek().map((day) => {
              const dayAvailability = getAvailabilityForDay(day.value);
              const isActive = dayAvailability?.is_active || false;

              return (
                <div
                  key={day.value}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    isActive
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleDayAvailability(day.value)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        disabled={saving}
                      />
                    </div>
                    <div className="min-w-[100px]">
                      <span className={`font-medium ${
                        isActive
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {day.name}
                      </span>
                    </div>
                  </div>

                  {isActive && dayAvailability && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
                        <input
                          type="time"
                          value={formatTimeForInput(dayAvailability.start_time)}
                          onChange={(e) => updateTimeSlot(day.value, 'start_time', e.target.value)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          disabled={saving}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
                        <input
                          type="time"
                          value={formatTimeForInput(dayAvailability.end_time)}
                          onChange={(e) => updateTimeSlot(day.value, 'end_time', e.target.value)}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          disabled={saving}
                        />
                      </div>
                    </div>
                  )}

                  {!isActive && (
                    <span className="text-sm text-gray-400 dark:text-gray-500">
                      Unavailable
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Actions
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => setBusinessHoursModal(true)}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
              disabled={saving}
            >
              <h3 className="font-medium text-gray-900 dark:text-white">Set Business Hours</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configure standard business schedule
              </p>
            </button>

            <button
              onClick={() => {
                // Set all days unavailable
                getDaysOfWeek().forEach(day => {
                  const existing = getAvailabilityForDay(day.value);
                  if (existing) {
                    updateAvailability(day.value, existing.start_time, existing.end_time, false);
                  }
                });
              }}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
              disabled={saving}
            >
              <h3 className="font-medium text-gray-900 dark:text-white">Close All Days</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Make property unavailable
              </p>
            </button>

            <Link
              href={`/property-calendars/${propertyId}/blocked-dates`}
              className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors block"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">Blocked Dates</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage holiday and maintenance blocks
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* Business Hours Modal */}
      {businessHoursModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Set Business Hours
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Days Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Days
                </label>
                <div className="space-y-2">
                  {getDaysOfWeek().map((day) => (
                    <div key={day.value} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`business-day-${day.value}`}
                        checked={businessHours.days.includes(day.value)}
                        onChange={() => toggleBusinessDay(day.value)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`business-day-${day.value}`}
                        className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        {day.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={businessHours.startTime}
                    onChange={(e) => setBusinessHours(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={businessHours.endTime}
                    onChange={(e) => setBusinessHours(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setBusinessHoursModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={applyBusinessHours}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={saving || businessHours.days.length === 0}
              >
                {saving ? 'Applying...' : 'Apply Hours'}
              </button>
            </div>
          </div>
        </div>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Saving changes...
        </div>
      )}
    </div>
  );
};

export default PropertyCalendarManager;