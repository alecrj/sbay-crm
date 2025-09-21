"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Appointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  lead?: {
    name: string;
    email: string;
    company?: string;
  };
}

const UpcomingAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingAppointments();
  }, []);

  const fetchUpcomingAppointments = async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          title,
          start_time,
          end_time,
          location,
          lead:leads(name, email, company)
        `)
        .gte('start_time', now.toISOString())
        .lte('start_time', oneWeekFromNow.toISOString())
        .order('start_time', { ascending: true })
        .limit(8);

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    let dayText = '';
    if (isToday) dayText = 'Today';
    else if (isTomorrow) dayText = 'Tomorrow';
    else dayText = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const timeText = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return { dayText, timeText, isToday, isTomorrow };
  };

  const getTimeUntil = (dateTime: string) => {
    const now = new Date();
    const appointmentTime = new Date(dateTime);
    const diffInMinutes = Math.floor((appointmentTime.getTime() - now.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) return `in ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `in ${Math.floor(diffInMinutes / 60)}h`;
    return `in ${Math.floor(diffInMinutes / 1440)}d`;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Appointments</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Appointments</h3>
          <Link
            href="/calendar"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View calendar →
          </Link>
        </div>
      </div>

      <div className="p-6">
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">No upcoming appointments</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Your appointments will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const { dayText, timeText, isToday, isTomorrow } = formatDateTime(appointment.start_time);
              return (
                <div key={appointment.id} className="flex items-center space-x-4 p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-xs font-medium ${
                    isToday ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    isTomorrow ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    <div className="leading-none">{dayText}</div>
                    <div className="leading-none font-bold">{timeText.split(' ')[0]}</div>
                    <div className="leading-none text-xs">{timeText.split(' ')[1]}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {appointment.title}
                      </h4>
                      {(isToday || isTomorrow) && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          isToday ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        }`}>
                          {getTimeUntil(appointment.start_time)}
                        </span>
                      )}
                    </div>

                    {appointment.lead && (
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          👤 {appointment.lead.name}
                        </span>
                        {appointment.lead.company && (
                          <span className="text-sm text-gray-500 dark:text-gray-500">
                            • {appointment.lead.company}
                          </span>
                        )}
                      </div>
                    )}

                    {appointment.location && (
                      <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        📍 {appointment.location}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingAppointments;