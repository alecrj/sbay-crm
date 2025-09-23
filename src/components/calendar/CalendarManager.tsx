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

      // Fetch appointments directly from Supabase
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          leads (
            id, name, email, phone, company
          )
        `)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
        return;
      }

      // Convert appointments to FullCalendar format
      const formattedEvents: FullCalendarEvent[] = (appointments || []).map((appointment) => ({
        id: appointment.id,
        title: appointment.title,
        start: appointment.start_time,
        end: appointment.end_time,
        backgroundColor: getEventColor(appointment.title, appointment.status),
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
        }
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventColor = (title: string, status?: string): string => {
    // Color by status first
    if (status === 'confirmed') return '#10B981'; // Green
    if (status === 'pending') return '#F59E0B'; // Amber
    if (status === 'cancelled') return '#EF4444'; // Red
    if (status === 'completed') return '#6B7280'; // Gray

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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Calendar & Appointments
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your appointments and schedule meetings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Confirmed
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              Pending
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Cancelled
            </div>
          </div>
        </div>
      </div>

      <div className="calendar-container bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
        <style jsx global>{`
          .fc-toolbar {
            margin-bottom: 1.5rem !important;
          }
          .fc-toolbar-title {
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            color: rgb(17 24 39) !important;
          }
          .dark .fc-toolbar-title {
            color: rgb(255 255 255) !important;
          }
          .fc-button {
            background: rgb(59 130 246) !important;
            border: none !important;
            border-radius: 0.5rem !important;
            padding: 0.5rem 1rem !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
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
            border-radius: 0.75rem !important;
            overflow: hidden !important;
          }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          initialView="dayGridMonth"
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="auto"
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
          }}
          slotMinTime="08:00:00"
          slotMaxTime="19:00:00"
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '09:00',
            endTime: '17:00',
          }}
          eventClassNames="cursor-pointer"
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