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
}

interface BlockedDate {
  id: string;
  property_id: string;
  blocked_date: string;
  reason: string;
  all_day: boolean;
  start_time?: string;
  end_time?: string;
  created_at: string;
}

interface BlockedDatesManagerProps {
  propertyId: string;
}

const BlockedDatesManager: React.FC<BlockedDatesManagerProps> = ({ propertyId }) => {
  const [property, setProperty] = useState<PropertyCalendar | null>(null);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for new blocked date
  const [newBlockedDate, setNewBlockedDate] = useState({
    date: '',
    reason: '',
    allDay: true,
    startTime: '09:00',
    endTime: '17:00'
  });

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    fetchData();
  }, [propertyId]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showCalendar && !target.closest('.calendar-container')) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch property details
      const { data: propertyData, error: propertyError } = await supabase
        .from('property_calendars')
        .select('id, property_id, property_title, property_size, property_county')
        .eq('property_id', propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Fetch blocked dates
      const { data: blockedData, error: blockedError } = await supabase
        .from('calendar_blocked_dates')
        .select('*')
        .eq('property_id', propertyId)
        .order('blocked_date', { ascending: true });

      if (blockedError) throw blockedError;

      setProperty(propertyData);
      setBlockedDates(blockedData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addBlockedDate = async () => {
    if (!newBlockedDate.date) {
      alert('Please select a date');
      return;
    }

    try {
      setSaving(true);

      const blockData = {
        property_id: propertyId,
        blocked_date: newBlockedDate.date,
        reason: newBlockedDate.reason || 'Blocked',
        all_day: newBlockedDate.allDay,
        start_time: newBlockedDate.allDay ? null : `${newBlockedDate.startTime}:00`,
        end_time: newBlockedDate.allDay ? null : `${newBlockedDate.endTime}:00`,
      };

      const { data, error } = await supabase
        .from('calendar_blocked_dates')
        .insert([blockData])
        .select()
        .single();

      if (error) throw error;

      setBlockedDates(prev => [...prev, data].sort((a, b) =>
        new Date(a.blocked_date).getTime() - new Date(b.blocked_date).getTime()
      ));

      // Reset form
      setNewBlockedDate({
        date: '',
        reason: '',
        allDay: true,
        startTime: '09:00',
        endTime: '17:00'
      });
    } catch (err) {
      console.error('Error adding blocked date:', err);
      alert('Failed to add blocked date. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeBlockedDate = async (id: string) => {
    if (!confirm('Are you sure you want to remove this blocked date?')) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('calendar_blocked_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBlockedDates(prev => prev.filter(bd => bd.id !== id));
    } catch (err) {
      console.error('Error removing blocked date:', err);
      alert('Failed to remove blocked date. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateBlocked = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return blockedDates.some(bd => bd.blocked_date === dateString);
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const selectDate = (date: Date) => {
    setNewBlockedDate(prev => ({ ...prev, date: formatDateForInput(date) }));
    setShowCalendar(false);
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
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
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Data</h3>
        <p className="text-red-600">{error || 'Property not found'}</p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
          <Link
            href={`/property-calendars/${propertyId}`}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Calendar
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
              href={`/property-calendars/${propertyId}`}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Blocked Dates
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
      </div>

      {/* Add New Blocked Date */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Block New Date
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Block specific dates when the property should not be available for booking
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Selection */}
            <div className="relative calendar-container">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date *
              </label>
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-left flex items-center justify-between"
                disabled={saving}
              >
                <span>
                  {newBlockedDate.date
                    ? new Date(newBlockedDate.date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'Select a date'
                  }
                </span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Calendar Dropdown */}
              {showCalendar && (
                <div className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-80">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>

                    <button
                      type="button"
                      onClick={nextMonth}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Quick Actions */}
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={goToToday}
                      className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                    >
                      Today
                    </button>
                  </div>

                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(currentMonth).map((date, index) => {
                      if (!date) {
                        return <div key={index} className="h-8"></div>;
                      }

                      const isBlocked = isDateBlocked(date);
                      const isPast = isPastDate(date);
                      const isSelected = newBlockedDate.date === formatDateForInput(date);

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => !isPast && selectDate(date)}
                          disabled={isPast}
                          className={`h-8 text-sm rounded flex items-center justify-center relative ${
                            isPast
                              ? 'text-gray-300 cursor-not-allowed dark:text-gray-600'
                              : isSelected
                                ? 'bg-blue-600 text-white'
                                : isBlocked
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          {date.getDate()}
                          {isBlocked && (
                            <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full transform translate-x-1 -translate-y-1"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                      <span>Blocked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-600 rounded"></div>
                      <span>Selected</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason
              </label>
              <input
                type="text"
                value={newBlockedDate.reason}
                onChange={(e) => setNewBlockedDate(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., Holiday, Maintenance, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={saving}
              />
            </div>

            {/* All Day Toggle */}
            <div className="md:col-span-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={newBlockedDate.allDay}
                  onChange={(e) => setNewBlockedDate(prev => ({ ...prev, allDay: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  disabled={saving}
                />
                <label htmlFor="allDay" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Block entire day
                </label>
              </div>
            </div>

            {/* Time Selection (only if not all day) */}
            {!newBlockedDate.allDay && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newBlockedDate.startTime}
                    onChange={(e) => setNewBlockedDate(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newBlockedDate.endTime}
                    onChange={(e) => setNewBlockedDate(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={saving}
                  />
                </div>
              </>
            )}

            {/* Add Button */}
            <div className="md:col-span-2">
              <button
                onClick={addBlockedDate}
                disabled={saving || !newBlockedDate.date}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Block Date'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Blocked Dates */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Current Blocked Dates
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {blockedDates.length} dates currently blocked
          </p>
        </div>

        <div className="p-6">
          {blockedDates.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 10l-4 4-2-2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Blocked Dates
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Block specific dates when the property should not be available for booking.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedDates.map((blockedDate) => (
                <div
                  key={blockedDate.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatDate(blockedDate.blocked_date)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {blockedDate.reason || 'No reason specified'}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {blockedDate.all_day ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            All Day
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            {formatTime(blockedDate.start_time!)} - {formatTime(blockedDate.end_time!)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeBlockedDate(blockedDate.id)}
                    disabled={saving}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove blocked date"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Processing...
        </div>
      )}
    </div>
  );
};

export default BlockedDatesManager;