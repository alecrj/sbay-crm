"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface PipelineData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

const LeadPipelineSummary: React.FC = () => {
  const [pipelineData, setPipelineData] = useState<PipelineData[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('status');

      if (error) throw error;

      const leads = data || [];
      const total = leads.length;
      setTotalLeads(total);

      // Count leads by status
      const statusCounts: Record<string, number> = {};
      leads.forEach(lead => {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
      });

      // Define pipeline stages with colors
      const stages = [
        { status: 'new', label: 'New Leads', color: 'bg-blue-500' },
        { status: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
        { status: 'qualified', label: 'Qualified', color: 'bg-purple-500' },
        { status: 'proposal-sent', label: 'Proposal Sent', color: 'bg-orange-500' },
        { status: 'closed-won', label: 'Closed Won', color: 'bg-green-500' },
        { status: 'closed-lost', label: 'Closed Lost', color: 'bg-red-500' },
      ];

      const pipeline = stages.map(stage => ({
        status: stage.label,
        count: statusCounts[stage.status] || 0,
        percentage: total > 0 ? Math.round(((statusCounts[stage.status] || 0) / total) * 100) : 0,
        color: stage.color,
      }));

      setPipelineData(pipeline);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lead Pipeline</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Pipeline</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {totalLeads} total leads in pipeline
            </p>
          </div>
          <Link
            href="/leads"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Manage leads →
          </Link>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {totalLeads === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">No leads in pipeline</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Leads will appear here as they're added to the system
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pipelineData.map((stage, index) => (
              <div key={stage.status} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                    <span className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                      {stage.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end sm:space-x-3">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {stage.count} leads
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[40px] text-right">
                      {stage.percentage}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${stage.color}`}
                    style={{ width: `${stage.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}

            {/* Conversion metrics */}
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-green-600">
                    {pipelineData.find(stage => stage.status === 'Closed Won')?.percentage || 0}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold text-purple-600">
                    {pipelineData.find(stage => stage.status === 'Qualified')?.count || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Qualified</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadPipelineSummary;