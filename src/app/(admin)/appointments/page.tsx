'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserRole } from '../../../contexts/UserRoleContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface Appointment {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  status: string;
  attendees: string[];
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
  created_at: string;
  property_id?: string;
  leads: {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
  };
}

interface Property {
  id: string;
  title: string;
  county: string;
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // 'all', 'upcoming', 'today', 'past'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'scheduled', 'confirmed', 'completed', 'cancelled'
  const [propertyFilter, setPropertyFilter] = useState('all'); // 'all' or property id
  const [properties, setProperties] = useState<Property[]>([]);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    newDate: '',
    newTime: '',
    reason: ''
  });

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, roleLoading, router]);

  useEffect(() => {
    loadAppointments();
    loadProperties();
  }, []);

  const loadAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        console.error('API error loading appointments:', result.error);
        setAppointments([]);
        return;
      }

      setAppointments(result.data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const response = await fetch('/api/properties');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        console.error('API error loading properties:', result.error);
        setProperties([]);
        return;
      }

      // Sort properties by county then title
      const sortedProperties = (result.properties || []).sort((a: Property, b: Property) => {
        if (a.county !== b.county) {
          return a.county.localeCompare(b.county);
        }
        return a.title.localeCompare(b.title);
      });

      setProperties(sortedProperties);
    } catch (error) {
      console.error('Error loading properties:', error);
      setProperties([]);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId,
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        console.error('API error updating appointment status:', result.error);
        return;
      }

      // Update local state
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === appointmentId
            ? { ...apt, status: newStatus }
            : apt
        )
      );
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  const sendRemindersManually = async () => {
    try {
      const response = await fetch('/.netlify/functions/send-appointment-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully sent ${result.remindersSent} reminders`);
        loadAppointments(); // Refresh to see updated reminder status
      } else {
        throw new Error('Failed to send reminders');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      alert('Failed to send reminders. Please try again.');
    }
  };

  const handleReschedule = (appointment: Appointment) => {
    setRescheduleAppointment(appointment);
    setRescheduleForm({
      newDate: '',
      newTime: '',
      reason: ''
    });
    setShowRescheduleModal(true);
  };

  const submitReschedule = async () => {
    if (!rescheduleAppointment || !rescheduleForm.newDate || !rescheduleForm.newTime) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/reschedule-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: rescheduleAppointment.id,
          newDate: rescheduleForm.newDate,
          newTime: rescheduleForm.newTime,
          reason: rescheduleForm.reason,
          requestedBy: 'Admin'
        })
      });

      if (response.ok) {
        alert('Appointment rescheduled successfully');
        setShowRescheduleModal(false);
        loadAppointments(); // Refresh appointments
      } else {
        throw new Error('Failed to reschedule appointment');
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      alert('Failed to reschedule appointment. Please try again.');
    }
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    let filtered = appointments;

    // Apply time filter
    switch (filter) {
      case 'upcoming':
        filtered = filtered.filter(apt => new Date(apt.start_time) >= now);
        break;
      case 'today':
        filtered = filtered.filter(apt => {
          const aptDate = new Date(apt.start_time);
          return aptDate >= today && aptDate < tomorrow;
        });
        break;
      case 'past':
        filtered = filtered.filter(apt => new Date(apt.start_time) < now);
        break;
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Apply property filter
    if (propertyFilter !== 'all') {
      filtered = filtered.filter(apt => apt.property_id === propertyFilter);
    }

    return filtered;
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                📅 Appointment Management
              </h1>
              <p className="text-gray-600">
                Manage your scheduled appointments and send reminders
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={sendRemindersManually}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Send Reminders</span>
              </button>

              <a
                href="/appointments/analytics"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Analytics</span>
              </a>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Filter
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Appointments</option>
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="past">Past</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Filter
              </label>
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Properties</option>
                {/* Group properties by county */}
                {Array.from(new Set(properties.map(p => p.county))).sort().map(county => (
                  <optgroup key={county} label={county}>
                    {properties
                      .filter(p => p.county === county)
                      .map(property => (
                        <option key={property.id} value={property.id}>
                          {property.title}
                        </option>
                      ))
                    }
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Appointments Grid */}
        <div className="grid gap-6">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600">
                {filter === 'all' ? 'No appointments have been booked yet.' : `No ${filter} appointments found.`}
              </p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => {
              const { date, time } = formatDateTime(appointment.start_time);
              const endTime = formatDateTime(appointment.end_time).time;

              return (
                <div key={appointment.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {appointment.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Client:</strong> {appointment.leads?.name}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Email:</strong> {appointment.leads?.email}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Phone:</strong> {appointment.leads?.phone}
                          </p>
                          {appointment.leads?.company && (
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Company:</strong> {appointment.leads?.company}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Date:</strong> {date}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Time:</strong> {time} - {endTime}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Location:</strong> {appointment.location}
                          </p>
                        </div>
                      </div>

                      {appointment.description && (
                        <p className="text-sm text-gray-700 mb-4">
                          <strong>Description:</strong> {appointment.description}
                        </p>
                      )}

                      {/* Reminder Status */}
                      <div className="flex items-center space-x-4 text-xs">
                        <div className={`flex items-center space-x-1 ${appointment.reminder_24h_sent ? 'text-green-600' : 'text-gray-400'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>24h reminder {appointment.reminder_24h_sent ? 'sent' : 'pending'}</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${appointment.reminder_2h_sent ? 'text-green-600' : 'text-gray-400'}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>2h reminder {appointment.reminder_2h_sent ? 'sent' : 'pending'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 ml-4">
                      <select
                        value={appointment.status}
                        onChange={(e) => updateAppointmentStatus(appointment.id, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <a
                        href={`/leads`}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded text-center hover:bg-blue-200"
                      >
                        View Lead
                      </a>

                      <button
                        onClick={() => handleReschedule(appointment)}
                        className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-center hover:bg-yellow-200"
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reschedule Modal */}
        {showRescheduleModal && rescheduleAppointment && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reschedule Appointment
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {rescheduleAppointment.title} with {rescheduleAppointment.leads?.name}
                </p>
              </div>

              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Date *
                    </label>
                    <input
                      type="date"
                      value={rescheduleForm.newDate}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, newDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Time *
                    </label>
                    <select
                      value={rescheduleForm.newTime}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, newTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select time...</option>
                      <option value="9:00 AM">9:00 AM</option>
                      <option value="9:30 AM">9:30 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="12:30 PM">12:30 PM</option>
                      <option value="1:00 PM">1:00 PM</option>
                      <option value="1:30 PM">1:30 PM</option>
                      <option value="2:00 PM">2:00 PM</option>
                      <option value="2:30 PM">2:30 PM</option>
                      <option value="3:00 PM">3:00 PM</option>
                      <option value="3:30 PM">3:30 PM</option>
                      <option value="4:00 PM">4:00 PM</option>
                      <option value="4:30 PM">4:30 PM</option>
                      <option value="5:00 PM">5:00 PM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Rescheduling (Optional)
                    </label>
                    <textarea
                      value={rescheduleForm.reason}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                      placeholder="Brief explanation for the client..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReschedule}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Reschedule Appointment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}