import type { Metadata } from "next";
import React, { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import heavy components with loading states
const CRMMetrics = dynamic(() => import("@/components/crm/CRMMetrics"), {
  loading: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  )
});

const RecentLeads = dynamic(() => import("@/components/crm/RecentLeads"), {
  loading: () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    </div>
  )
});

const UpcomingAppointments = dynamic(() => import("@/components/crm/UpcomingAppointments"), {
  loading: () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    </div>
  )
});

const LeadPipelineSummary = dynamic(() => import("@/components/crm/LeadPipelineSummary"), {
  loading: () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    </div>
  )
});

export const metadata: Metadata = {
  title: "Dashboard | alecrj software CRM",
  description: "Professional CRM Dashboard by alecrj software",
};

export default function CRMDashboard() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-xl sm:rounded-2xl shadow-xl text-white p-4 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-sm text-blue-200 mt-4 space-y-1 sm:space-y-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  System Online
                </div>
                <div className="text-blue-300 text-xs sm:text-sm">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-4">
              <a
                href="/invitations"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center gap-2 border border-white/20 hover:border-white/30 hover:scale-105 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="hidden sm:inline">Invite User</span>
                <span className="sm:hidden">Invite</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CRM Metrics */}
      <CRMMetrics />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Lead Pipeline - spans 1 column */}
        <div className="xl:col-span-1 order-2 xl:order-1">
          <LeadPipelineSummary />
        </div>

        {/* Recent Leads - spans 2 columns */}
        <div className="xl:col-span-2 order-1 xl:order-2">
          <RecentLeads />
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div>
        <UpcomingAppointments />
      </div>

    </div>
  );
}
