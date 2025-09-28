"use client";
import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { CalendarEvent } from '@/lib/google-calendar';
import { supabase } from '@/lib/supabase';
import AppointmentModal from './AppointmentModal';

interface FullCalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  extendedProps?: {
    description?: string;
    location?: string;
    attendees?: string[];
    leadId?: string;
    appointmentId?: string;
    propertyId?: string;
    propertyTitle?: string;
    propertyCounty?: string;
  };
}

const CalendarManager: React.FC = () => {
  const [events, setEvents] = useState<FullCalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);

      // Fetch appointments directly from Supabase with property information
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          leads (
            id, name, email, phone, company
          ),
          property_calendars (
            property_id,
            property_title,
            property_county
          )
        `)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        return;
      }

      // Convert appointments to FullCalendar format
      const formattedEvents: FullCalendarEvent[] = (appointments || []).map((appointment) => {
        // Create title with property information
        const propertyTitle = appointment.property_calendars?.property_title;
        const displayTitle = propertyTitle
          ? `${appointment.title} @ ${propertyTitle}`
          : appointment.title;

        return {
          id: appointment.id,
          title: displayTitle,
          start: appointment.start_time,
          end: appointment.end_time,
          backgroundColor: getEventColor(appointment.title, appointment.status, appointment.property_id),
          extendedProps: {
            description: appointment.description,
            location: appointment.location,
            attendees: appointment.attendees || [],
            leadId: appointment.lead_id,
            appointmentId: appointment.id,
            status: appointment.status,
            leadName: appointment.leads?.name,
            leadEmail: appointment.leads?.email,
            leadPhone: appointment.leads?.phone,
            leadCompany: appointment.leads?.company,
            propertyId: appointment.property_id,
            propertyTitle: appointment.property_calendars?.property_title,
            propertyCounty: appointment.property_calendars?.property_county,
          }
        };
      });

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventColor = (title: string, status?: string, propertyId?: string): string => {
    // Color by status first
    if (status === 'confirmed') return '#10B981'; // Green
    if (status === 'pending') return '#F59E0B'; // Amber
    if (status === 'cancelled') return '#EF4444'; // Red
    if (status === 'completed') return '#6B7280'; // Gray

    // If we have a property ID, use a property-specific color
    if (propertyId) {
      const colors = [
        '#3B82F6', // Blue
        '#8B5CF6', // Purple
        '#EF4444', // Red
        '#F59E0B', // Amber
        '#10B981', // Green
        '#F97316', // Orange
        '#EC4899', // Pink
        '#6366F1', // Indigo
      ];

      // Use property ID to consistently assign colors
      const colorIndex = Math.abs(propertyId.split('').reduce((a, b) => {
        return a + b.charCodeAt(0);
      }, 0)) % colors.length;

      return colors[colorIndex];
    }

    // Fallback to title-based colors
    if (title.toLowerCase().includes('consultation')) return '#3B82F6';
    if (title.toLowerCase().includes('showing')) return '#10B981';
    if (title.toLowerCase().includes('meeting')) return '#8B5CF6';
    return '#6B7280';
  };

  const handleDateSelect = (selectInfo: any) => {
    setSelectedDate(selectInfo.startStr);
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent(clickInfo.event);
    setIsModalOpen(true);
  };

  const handleEventCreate = async (eventData: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    attendees?: string[];
    leadId?: string;
  }) => {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) throw new Error('Failed to create event');

      // Refresh events
      await fetchEvents();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create appointment. Please try again.');
    }
  };

  const handleEventUpdate = async (eventData: {
    appointmentId: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    attendees?: string[];
  }) => {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) throw new Error('Failed to update event');

      await fetchEvents();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update appointment. Please try again.');
    }
  };

  const handleEventDelete = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/calendar/events?id=${appointmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete event');

      await fetchEvents();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete appointment. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-3 sm:p-6 lg:p-8">
      <div className="mb-4 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
              Calendar & Appointments
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Manage your appointments and schedule meetings
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
              Confirmed
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-amber-500 rounded-full"></div>
              Pending
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
              Cancelled
            </div>
          </div>
        </div>
      </div>

      <div className="calendar-container bg-gray-50 dark:bg-gray-900/30 rounded-lg sm:rounded-xl p-2 sm:p-4 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
        <style jsx global>{`
          .fc-toolbar {
            margin-bottom: 1rem !important;
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
          }
          .fc-toolbar-title {
            font-size: 1.125rem !important;
            font-weight: 700 !important;
            color: rgb(17 24 39) !important;
            margin: 0 !important;
          }
          @media (min-width: 640px) {
            .fc-toolbar {
              margin-bottom: 1.5rem !important;
              flex-wrap: nowrap !important;
            }
            .fc-toolbar-title {
              font-size: 1.5rem !important;
            }
          }
          .dark .fc-toolbar-title {
            color: rgb(255 255 255) !important;
          }
          .fc-button {
            background: rgb(59 130 246) !important;
            border: none !important;
            border-radius: 0.375rem !important;
            padding: 0.25rem 0.5rem !important;
            font-weight: 500 !important;
            font-size: 0.75rem !important;
            transition: all 0.2s ease !important;
          }
          @media (min-width: 640px) {
            .fc-button {
              border-radius: 0.5rem !important;
              padding: 0.5rem 1rem !important;
              font-size: 0.875rem !important;
            }
          }
          .fc-button:hover {
            background: rgb(37 99 235) !important;
            transform: translateY(-1px) !important;
          }
          .fc-button:focus {
            box-shadow: 0 0 0 3px rgb(59 130 246 / 0.3) !important;
          }
          .fc-today-button {
            background: rgb(16 185 129) !important;
          }
          .fc-today-button:hover {
            background: rgb(5 150 105) !important;
          }
          .fc-daygrid-day.fc-day-today {
            background: rgb(239 246 255) !important;
          }
          .dark .fc-daygrid-day.fc-day-today {
            background: rgb(30 58 138 / 0.2) !important;
          }
          .fc-event {
            border-radius: 0.5rem !important;
            border: none !important;
            padding: 0.25rem 0.5rem !important;
            font-weight: 500 !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
            transition: all 0.2s ease !important;
          }
          .fc-event:hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          }
          .fc-daygrid-event-dot {
            display: none !important;
          }
          .fc-h-event {
            border-radius: 0.5rem !important;
          }
          .fc-col-header-cell {
            background: rgb(249 250 251) !important;
            border: 1px solid rgb(229 231 235) !important;
            font-weight: 600 !important;
          }
          .dark .fc-col-header-cell {
            background: rgb(17 24 39) !important;
            border: 1px solid rgb(55 65 81) !important;
            color: rgb(255 255 255) !important;
          }
          .fc-scrollgrid {
            border-radius: 0.5rem !important;
            overflow: hidden !important;
          }
          @media (min-width: 640px) {
            .fc-scrollgrid {
              border-radius: 0.75rem !important;
            }
          }
          .fc-daygrid-event {
            font-size: 0.75rem !important;
            margin: 0.125rem 0 !important;
          }
          @media (min-width: 640px) {
            .fc-daygrid-event {
              font-size: 0.875rem !important;
              margin: 0.25rem 0 !important;
            }
          }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: 'dayGridMonth,listWeek'
          }}
          initialView="dayGridMonth"
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={window.innerWidth >= 640 ? true : 2}
          moreLinkClick="popover"
          weekends={true}
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="auto"
          aspectRatio={window.innerWidth >= 768 ? 1.35 : 0.8}
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: window.innerWidth >= 640 ? 'short' : false
          }}
          slotMinTime="08:00:00"
          slotMaxTime="19:00:00"
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '09:00',
            endTime: '17:00',
          }}
          eventClassNames="cursor-pointer"
          nowIndicator={true}
          dayHeaderFormat={window.innerWidth >= 640 ? { weekday: 'short', day: 'numeric', omitCommas: true } : { weekday: 'narrow' }}
        />
      </div>

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        selectedEvent={selectedEvent}
        onEventCreate={handleEventCreate}
        onEventUpdate={handleEventUpdate}
        onEventDelete={handleEventDelete}
      />
    </div>
  );
};

export default CalendarManager;