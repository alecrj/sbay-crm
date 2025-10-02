"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface CRMStats {
  totalLeads: number;
  newLeads: number;
  appointmentsToday: number;
  propertiesListed: number;
  closedDeals: number;
  conversionRate: number;
}

const CRMMetrics: React.FC = () => {
  const [stats, setStats] = useState<CRMStats>({
    totalLeads: 0,
    newLeads: 0,
    appointmentsToday: 0,
    propertiesListed: 0,
    closedDeals: 0,
    conversionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCRMStats();
  }, []);

  const fetchCRMStats = async () => {
    try {
      setIsLoading(true);

      // Get current date for today's calculations
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const thisMonth = today.toISOString().slice(0, 7);

      // Fetch leads data using the API
      const response = await fetch('/api/leads');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const leads = result.data || [];

      // Fetch appointments for today
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('id')
        .gte('start_time', `${todayStr}T00:00:00`)
        .lt('start_time', `${todayStr}T23:59:59`);

      // Fetch properties
      const { data: properties } = await supabase
        .from('properties')
        .select('created_at');

      // Calculate metrics
      const totalLeads = leads?.length || 0;
      const newLeads = leads?.filter(lead =>
        lead.status === 'new' &&
        lead.created_at.startsWith(thisMonth)
      ).length || 0;

      const closedDeals = leads?.filter(lead =>
        lead.status === 'won'
      ).length || 0;

      const conversionRate = totalLeads > 0 ?
        Math.round((closedDeals / totalLeads) * 100) : 0;

      const propertiesListed = properties?.length || 0;

      setStats({
        totalLeads,
        newLeads,
        appointmentsToday: todayAppointments?.length || 0,
        propertiesListed,
        closedDeals,
        conversionRate,
      });

    } catch (error) {
      console.error('Error fetching CRM stats:', error);

      // Keep the stats at 0 when API fails, but don't show empty state
      setStats({
        totalLeads: 0,
        newLeads: 0,
        appointmentsToday: 0,
        propertiesListed: 0,
        closedDeals: 0,
        conversionRate: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const MetricCard = ({
    title,
    value,
    icon,
    trend,
    trendDirection = 'up',
    color = 'blue'
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    trendDirection?: 'up' | 'down';
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  }) => {
    const colorClasses = {
      blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
      green: 'bg-gradient-to-br from-green-500 to-green-600',
      purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
      orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
      red: 'bg-gradient-to-br from-red-500 to-red-600',
    };

    const bgClasses = {
      blue: 'bg-blue-50 dark:bg-blue-900/10',
      green: 'bg-green-50 dark:bg-green-900/10',
      purple: 'bg-purple-50 dark:bg-purple-900/10',
      orange: 'bg-orange-50 dark:bg-orange-900/10',
      red: 'bg-red-50 dark:bg-red-900/10',
    };

    return (
      <div className={`${bgClasses[color]} border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 p-4 sm:p-6 group hover:scale-[1.02]`}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className={`w-10 h-10 sm:w-14 sm:h-14 ${colorClasses[color]} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-shadow duration-200`}>
            <div className="w-4 h-4 sm:w-6 sm:h-6">
              {icon}
            </div>
          </div>
          {trend && (
            <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
              trendDirection === 'up'
                ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
                : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
            }`}>
              <svg className={`w-3 h-3 mr-1 ${trendDirection === 'down' ? 'rotate-180' : ''}`}
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {trend}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {isLoading ? (
              <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ) : (
              value
            )}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">{title}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
      <MetricCard
        title="Total Leads"
        value={stats.totalLeads}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
        color="blue"
      />

      <MetricCard
        title="New Leads This Month"
        value={stats.newLeads}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        }
        color="green"
      />


      <MetricCard
        title="Appointments Today"
        value={stats.appointmentsToday}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        color="orange"
      />

      <MetricCard
        title="Active Properties"
        value={stats.propertiesListed}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
        color="blue"
      />

      <MetricCard
        title="Closed Deals"
        value={stats.closedDeals}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="green"
      />


      <MetricCard
        title="Conversion Rate"
        value={`${stats.conversionRate}%`}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        color="orange"
      />
    </div>
  );
};

export default CRMMetrics;