"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Lead {
  id: string;
  name: string;
  email: string;
  title: string;
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
  selectedEvent?: any;
  onEventCreate: (eventData: any) => void;
  onEventUpdate: (eventData: any) => void;
  onEventDelete: (appointmentId: string) => void;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedEvent,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    attendees: '',
    leadId: '',
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
      if (selectedEvent) {
        // Editing existing event
        const start = new Date(selectedEvent.start);
        const end = new Date(selectedEvent.end || new Date(start.getTime() + 60 * 60 * 1000));

        setFormData({
          title: selectedEvent.title,
          description: selectedEvent.extendedProps?.description || '',
          startTime: formatDateTimeLocal(start),
          endTime: formatDateTimeLocal(end),
          location: selectedEvent.extendedProps?.location || '',
          attendees: selectedEvent.extendedProps?.attendees?.join(', ') || '',
          leadId: selectedEvent.extendedProps?.leadId || '',
        });
      } else if (selectedDate) {
        // Creating new event
        const start = new Date(selectedDate);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour duration

        setFormData({
          title: '',
          description: '',
          startTime: formatDateTimeLocal(start),
          endTime: formatDateTimeLocal(end),
          location: '',
          attendees: '',
          leadId: '',
        });
      }
    }
  }, [isOpen, selectedEvent, selectedDate]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, title')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const attendeesArray = formData.attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email);

      const eventData = {
        ...formData,
        attendees: attendeesArray,
      };

      if (selectedEvent) {
        // Update existing event
        await onEventUpdate({
          appointmentId: selectedEvent.id,
          ...eventData,
        });
      } else {
        // Create new event
        await onEventCreate(eventData);
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedEvent && confirm('Are you sure you want to delete this appointment?')) {
      await onEventDelete(selectedEvent.id);
    }
  };

  const handleLeadSelect = (leadId: string) => {
    const selectedLead = leads.find(lead => lead.id === leadId);
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        leadId,
        title: prev.title || `${selectedLead.title} - ${selectedLead.name}`,
        attendees: prev.attendees || selectedLead.email,
      }));
    } else {
      setFormData(prev => ({ ...prev, leadId }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedEvent ? 'Edit Appointment' : 'New Appointment'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Appointment title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Associated Lead
              </label>
              <select
                value={formData.leadId}
                onChange={(e) => handleLeadSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select a lead (optional)</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} - {lead.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Meeting location"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attendees
              </label>
              <input
                type="text"
                value={formData.attendees}
                onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Email addresses (comma separated)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Appointment details"
              />
            </div>

            <div className="flex justify-between pt-4">
              <div>
                {selectedEvent && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : selectedEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;