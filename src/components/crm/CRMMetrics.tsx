"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface CRMStats {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  appointmentsToday: number;
  propertiesListed: number;
  closedDeals: number;
  conversionRate: number;
  avgDealValue: string;
}

const CRMMetrics: React.FC = () => {
  const [stats, setStats] = useState<CRMStats>({
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    appointmentsToday: 0,
    propertiesListed: 0,
    closedDeals: 0,
    conversionRate: 0,
    avgDealValue: '$0',
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

      // Fetch leads data
      const { data: leads } = await supabase
        .from('leads')
        .select('status, priority, created_at');

      // Fetch appointments for today
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('id')
        .gte('start_time', `${todayStr}T00:00:00`)
        .lt('start_time', `${todayStr}T23:59:59`);

      // Fetch properties
      const { data: properties } = await supabase
        .from('properties')
        .select('status, created_at');

      // Calculate metrics
      const totalLeads = leads?.length || 0;
      const newLeads = leads?.filter(lead =>
        lead.status === 'new' &&
        lead.created_at.startsWith(thisMonth)
      ).length || 0;

      const qualifiedLeads = leads?.filter(lead =>
        lead.status === 'qualified'
      ).length || 0;

      const closedDeals = leads?.filter(lead =>
        lead.status === 'closed-won'
      ).length || 0;

      const conversionRate = totalLeads > 0 ?
        Math.round((closedDeals / totalLeads) * 100) : 0;

      const propertiesListed = properties?.filter(prop =>
        prop.status === 'available' || prop.status === 'featured'
      ).length || 0;

      setStats({
        totalLeads,
        newLeads,
        qualifiedLeads,
        appointmentsToday: todayAppointments?.length || 0,
        propertiesListed,
        closedDeals,
        conversionRate,
        avgDealValue: '$2.5M', // This could be calculated from actual deal data
      });

    } catch (error) {
      console.error('Error fetching CRM stats:', error);
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
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center text-white`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center text-sm ${
              trendDirection === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              <svg className={`w-4 h-4 mr-1 ${trendDirection === 'down' ? 'rotate-180' : ''}`}
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {trend}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isLoading ? '...' : value}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        trend="+12% this month"
        trendDirection="up"
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
        trend="+8% vs last month"
        trendDirection="up"
      />

      <MetricCard
        title="Qualified Leads"
        value={stats.qualifiedLeads}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        }
        color="purple"
        trend={`${stats.conversionRate}% conversion`}
        trendDirection="up"
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
        color="blue"
        trend="5 new this week"
        trendDirection="up"
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
        trend={`${stats.conversionRate}% rate`}
        trendDirection="up"
      />

      <MetricCard
        title="Avg Deal Value"
        value={stats.avgDealValue}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
        color="purple"
        trend="+15% this quarter"
        trendDirection="up"
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
        trend="+3% this month"
        trendDirection="up"
      />
    </div>
  );
};

export default CRMMetrics;