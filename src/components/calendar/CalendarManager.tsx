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

      // Fetch events from our API which combines Google Calendar and database
      const response = await fetch('/api/calendar/events');
      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();

      // Convert to FullCalendar format
      const formattedEvents: FullCalendarEvent[] = data.events.map((event: CalendarEvent) => ({
        id: event.id || '',
        title: event.summary,
        start: event.start.dateTime,
        end: event.end.dateTime,
        backgroundColor: getEventColor(event.summary),
        extendedProps: {
          description: event.description,
          location: event.location,
          attendees: event.attendees?.map(a => a.email) || [],
        }
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventColor = (title: string): string => {
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Calendar & Appointments
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage appointments and sync with Google Calendar
        </p>
      </div>

      <div className="calendar-container">
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
            daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
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