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

      const response = await fetch('/api/leads');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const allLeads = result.data || [];

      // Get the 5 most recent leads
      const recentLeads = allLeads
        .sort((a: RecentLead, b: RecentLead) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setLeads(recentLeads);

    } catch (error) {
      console.error('Error fetching recent leads:', error);
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-[500px] flex flex-col">
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

      <div className="p-6 flex-1 overflow-hidden flex flex-col">
        {leads.length === 0 ? (
          <div className="text-center py-8 flex-1 flex flex-col justify-center">
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
          <div className="space-y-4 overflow-y-auto flex-1">
            {leads.map((lead) => (
              <div key={lead.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors space-y-2 sm:space-y-0">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 dark:text-blue-400 font-medium text-xs sm:text-sm">
                      {lead.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                        {lead.name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(lead.status)} mt-1 sm:mt-0 self-start sm:self-auto`}>
                        {lead.status.replace('-', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-all">
                        {lead.email}
                      </div>
                      {lead.company && (
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 truncate">
                          🏢 {lead.company}
                        </div>
                      )}
                      {lead.property_interest && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
                          🏠 {lead.property_interest}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 text-xs sm:text-sm">
                  <div className="flex items-center space-x-1">
                    <span className="text-base sm:text-lg">{getSourceIcon(lead.source)}</span>
                    <span className="hidden md:inline text-gray-500 dark:text-gray-400 capitalize">
                      {lead.source.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="text-gray-400 dark:text-gray-500">
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