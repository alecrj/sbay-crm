"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface RecentLead {
  id: string;
  name: string;
  email: string;
  company?: string;
  status: string;
  priority: string;
  source: string;
  property_interest?: string;
  created_at: string;
}

const RecentLeads: React.FC = () => {
  const [leads, setLeads] = useState<RecentLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentLeads();
  }, []);

  const fetchRecentLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, company, status, priority, source, property_interest, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Supabase error fetching recent leads:', error);
        console.error('Error details:', {
          message: error.message,
          hint: error.hint,
          details: error.details,
          code: error.code
        });

        // If table doesn't exist, show empty state
        if (error.code === '42P01') {
          console.log('Leads table does not exist yet. Please run the CREATE_LEADS_TABLE.sql script.');
          setLeads([]);
          return;
        }

        throw error;
      }

      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching recent leads:', error);
      // Set empty array on any error to prevent UI crashes
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'new': 'bg-blue-100 text-blue-800 border-blue-200',
      'contacted': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'qualified': 'bg-purple-100 text-purple-800 border-purple-200',
      'proposal-sent': 'bg-orange-100 text-orange-800 border-orange-200',
      'closed-won': 'bg-green-100 text-green-800 border-green-200',
      'closed-lost': 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': 'text-green-600',
      'medium': 'text-yellow-600',
      'high': 'text-orange-600',
      'urgent': 'text-red-600',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  const getSourceIcon = (source: string) => {
    const icons = {
      'website': '🌐',
      'referral': '👥',
      'cold-call': '📞',
      'email-campaign': '📧',
      'social-media': '📱',
      'trade-show': '🏛️',
      'other': '🔗',
    };
    return icons[source as keyof typeof icons] || '📋';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Leads</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Leads</h3>
          <Link
            href="/leads"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View all →
          </Link>
        </div>
      </div>

      <div className="p-6">
        {leads.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">No leads yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Leads will appear here when they're added to the system
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                      {lead.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {lead.name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.status)}`}>
                        {lead.status.replace('-', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {lead.email}
                      </span>
                      {lead.company && (
                        <span className="text-sm text-gray-500 dark:text-gray-500 truncate">
                          {lead.company}
                        </span>
                      )}
                    </div>

                    {lead.property_interest && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                        🏢 {lead.property_interest}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <div className="flex items-center space-x-1">
                    <span className="text-lg">{getSourceIcon(lead.source)}</span>
                    <span className="hidden sm:inline text-gray-500 dark:text-gray-400 capitalize">
                      {lead.source.replace('-', ' ')}
                    </span>
                  </div>

                  <div className={`font-medium ${getPriorityColor(lead.priority)}`}>
                    {lead.priority.toUpperCase()}
                  </div>

                  <div className="text-gray-400 dark:text-gray-500 text-xs">
                    {formatDate(lead.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentLeads;