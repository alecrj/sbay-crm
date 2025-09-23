'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useUserRole } from '../../../../contexts/UserRoleContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

interface AppointmentStats {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  scheduledAppointments: number;
  thisMonthAppointments: number;
  lastMonthAppointments: number;
  averageDuration: number;
  conversionRate: number;
  remindersSent: number;
  followUpsSent: number;
}

interface AppointmentsByType {
  [key: string]: number;
}

interface AppointmentsByMonth {
  month: string;
  appointments: number;
  completed: number;
}

export default function AppointmentAnalytics() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AppointmentStats>({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    scheduledAppointments: 0,
    thisMonthAppointments: 0,
    lastMonthAppointments: 0,
    averageDuration: 0,
    conversionRate: 0,
    remindersSent: 0,
    followUpsSent: 0
  });
  const [appointmentsByType, setAppointmentsByType] = useState<AppointmentsByType>({});
  const [appointmentsByMonth, setAppointmentsByMonth] = useState<AppointmentsByMonth[]>([]);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, roleLoading, router]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Load all appointments with related data
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          leads (
            id, name, email, company, status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading appointments:', error);
        return;
      }

      if (!appointments) return;

      // Calculate basic stats
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
      const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;
      const scheduledAppointments = appointments.filter(apt => apt.status === 'scheduled' || apt.status === 'confirmed').length;

      const thisMonthAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.created_at);
        return aptDate >= thisMonth && aptDate <= thisMonthEnd;
      }).length;

      const lastMonthAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.created_at);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return aptDate >= lastMonth && aptDate <= lastMonthEnd;
      }).length;

      // Calculate average duration
      const completedWithDuration = appointments.filter(apt =>
        apt.status === 'completed' && apt.start_time && apt.end_time
      );
      const totalDuration = completedWithDuration.reduce((sum, apt) => {
        const duration = new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime();
        return sum + duration / (1000 * 60); // Convert to minutes
      }, 0);
      const averageDuration = completedWithDuration.length > 0 ? totalDuration / completedWithDuration.length : 0;

      // Calculate conversion rate (completed / total)
      const conversionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

      // Count reminders and follow-ups sent
      const remindersSent = appointments.reduce((sum, apt) => {
        let count = 0;
        if (apt.reminder_24h_sent) count++;
        if (apt.reminder_2h_sent) count++;
        return sum + count;
      }, 0);

      const followUpsSent = appointments.reduce((sum, apt) => {
        let count = 0;
        if (apt.followup_immediate_followup_sent) count++;
        if (apt.followup_24h_followup_sent) count++;
        if (apt.followup_3day_followup_sent) count++;
        if (apt.followup_1week_followup_sent) count++;
        return sum + count;
      }, 0);

      // Group by appointment type
      const typeStats: AppointmentsByType = {};
      appointments.forEach(apt => {
        // Extract type from title or description
        const title = apt.title.toLowerCase();
        let type = 'consultation';
        if (title.includes('viewing')) type = 'property-viewing';
        else if (title.includes('portfolio')) type = 'portfolio-review';
        else if (title.includes('analysis')) type = 'market-analysis';

        typeStats[type] = (typeStats[type] || 0) + 1;
      });

      // Group by month for the last 12 months
      const monthlyStats: AppointmentsByMonth[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const monthAppointments = appointments.filter(apt => {
          const aptDate = new Date(apt.created_at);
          return aptDate >= monthDate && aptDate <= monthEnd;
        });

        const monthCompleted = monthAppointments.filter(apt => apt.status === 'completed').length;

        monthlyStats.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          appointments: monthAppointments.length,
          completed: monthCompleted
        });
      }

      setStats({
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        scheduledAppointments,
        thisMonthAppointments,
        lastMonthAppointments,
        averageDuration: Math.round(averageDuration),
        conversionRate: Math.round(conversionRate * 10) / 10,
        remindersSent,
        followUpsSent
      });

      setAppointmentsByType(typeStats);
      setAppointmentsByMonth(monthlyStats);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                📊 Appointment Analytics
              </h1>
              <p className="text-gray-600">
                Insights and performance metrics for your appointment system
              </p>
            </div>
            <button
              onClick={() => router.push('/appointments')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              ← Back to Appointments
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduledAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Comparison</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Month</span>
                <span className="text-2xl font-bold text-blue-600">{stats.thisMonthAppointments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last Month</span>
                <span className="text-2xl font-bold text-gray-400">{stats.lastMonthAppointments}</span>
              </div>
              {stats.thisMonthAppointments > stats.lastMonthAppointments && (
                <div className="text-green-600 text-sm flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  {((stats.thisMonthAppointments - stats.lastMonthAppointments) / Math.max(stats.lastMonthAppointments, 1) * 100).toFixed(1)}% increase
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Duration</span>
                <span className="text-lg font-semibold">{stats.averageDuration} min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Reminders Sent</span>
                <span className="text-lg font-semibold">{stats.remindersSent}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Follow-ups Sent</span>
                <span className="text-lg font-semibold">{stats.followUpsSent}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments by Type</h3>
            <div className="space-y-3">
              {Object.entries(appointmentsByType).map(([type, count]) => {
                const percentage = stats.totalAppointments > 0 ? (count / stats.totalAppointments) * 100 : 0;
                const typeLabels: { [key: string]: string } = {
                  'consultation': 'Initial Consultations',
                  'property-viewing': 'Property Viewings',
                  'portfolio-review': 'Portfolio Reviews',
                  'market-analysis': 'Market Analysis'
                };

                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{typeLabels[type] || type}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Last 12 Months Trend</h3>
            <div className="space-y-2">
              {appointmentsByMonth.slice(-6).map((month, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{month.month}</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-blue-600 font-medium">{month.appointments} total</span>
                    <span className="text-green-600 font-medium">{month.completed} completed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.completedAppointments}</p>
              <p className="text-sm text-green-600 font-medium">Completed</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{stats.scheduledAppointments}</p>
              <p className="text-sm text-blue-600 font-medium">Scheduled</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats.cancelledAppointments}</p>
              <p className="text-sm text-red-600 font-medium">Cancelled</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">{stats.totalAppointments}</p>
              <p className="text-sm text-gray-600 font-medium">Total</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}