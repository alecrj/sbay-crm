"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

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
}

interface BlockedDate {
  id: string;
  property_id: string;
  blocked_date: string;
  reason: string | null;
  created_at: string;
}

const BlockedDatesPage = () => {
  const params = useParams();
  const propertyId = params.propertyId as string;

  const [property, setProperty] = useState<PropertyCalendar | null>(null);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (propertyId) {
      fetchData();
    }
  }, [propertyId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch property details
      const { data: propertyData, error: propertyError } = await supabase
        .from('property_calendars')
        .select('*')
        .eq('property_id', propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Fetch blocked dates
      const { data: blockedData, error: blockedError } = await supabase
        .from('calendar_blocked_dates')
        .select('*')
        .eq('property_id', propertyId)
        .order('blocked_date', { ascending: true });

      if (blockedError && blockedError.code !== 'PGRST116') {
        throw blockedError;
      }

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
    if (!newDate) return;

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from('calendar_blocked_dates')
        .insert([{
          property_id: propertyId,
          blocked_date: newDate,
          reason: newReason || null
        }])
        .select()
        .single();

      if (error) throw error;

      setBlockedDates(prev => [...prev, data].sort((a, b) =>
        new Date(a.blocked_date).getTime() - new Date(b.blocked_date).getTime()
      ));

      setNewDate('');
      setNewReason('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding blocked date:', err);
      alert('Failed to add blocked date. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeBlockedDate = async (id: string) => {
    if (!confirm('Are you sure you want to remove this blocked date?')) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('calendar_blocked_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBlockedDates(prev => prev.filter(date => date.id !== id));
    } catch (err) {
      console.error('Error removing blocked date:', err);
      alert('Failed to remove blocked date. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isDateInPast = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Get today's date in YYYY-MM-DD format for min date
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
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
            onClick={fetchData}
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
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          disabled={saving}
        >
          {showAddForm ? 'Cancel' : 'Add Blocked Date'}
        </button>
      </div>

      {/* Add Blocked Date Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Add New Blocked Date
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={getTodayString()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="e.g., Holiday, Maintenance, Personal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={saving}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={addBlockedDate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={saving || !newDate}
            >
              {saving ? 'Adding...' : 'Add Blocked Date'}
            </button>
          </div>
        </div>
      )}

      {/* Blocked Dates List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Currently Blocked Dates
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            These dates will be unavailable for booking even if the day of week is normally open
          </p>
        </div>

        <div className="p-6">
          {blockedDates.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Blocked Dates
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                All dates follow your regular weekly schedule. Add blocked dates to override specific days.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedDates.map((blockedDate) => (
                <div
                  key={blockedDate.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isDateInPast(blockedDate.blocked_date)
                      ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        isDateInPast(blockedDate.blocked_date)
                          ? 'text-gray-500 dark:text-gray-400'
                          : 'text-red-900 dark:text-red-100'
                      }`}>
                        {formatDate(blockedDate.blocked_date)}
                      </span>
                      {isDateInPast(blockedDate.blocked_date) && (
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-full dark:bg-gray-700 dark:text-gray-400">
                          Past
                        </span>
                      )}
                    </div>
                    {blockedDate.reason && (
                      <p className={`text-sm mt-1 ${
                        isDateInPast(blockedDate.blocked_date)
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {blockedDate.reason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeBlockedDate(blockedDate.id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    disabled={saving}
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
          Saving changes...
        </div>
      )}
    </div>
  );
};

export default BlockedDatesPage;