"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Appointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  status: string;
}

interface LeadAppointmentsProps {
  leadId: string;
  onAppointmentClick?: (appointment: Appointment) => void;
}

const LeadAppointments: React.FC<LeadAppointmentsProps> = ({
  leadId,
  onAppointmentClick
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [leadId]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('lead_id', leadId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No appointments scheduled
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-700 mb-2">
        Appointments ({appointments.length})
      </div>
      {appointments.map((appointment) => (
        <div
          key={appointment.id}
          onClick={() => onAppointmentClick?.(appointment)}
          className="bg-gray-50 rounded p-2 text-xs cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium text-gray-800 truncate">
              {appointment.title}
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                appointment.status
              )}`}
            >
              {appointment.status}
            </span>
          </div>
          <div className="text-gray-600">
            {formatDateTime(appointment.start_time)}
          </div>
          {appointment.location && (
            <div className="text-gray-500 truncate">
              📍 {appointment.location}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default LeadAppointments;