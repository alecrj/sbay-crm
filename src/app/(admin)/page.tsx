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
              <p className="text-blue-100 text-base sm:text-lg">Professional CRM by alecrj software</p>
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
              <div className="hidden lg:block">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/20">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
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

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Quick Actions</h3>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <a
            href="/leads"
            className="group flex items-center p-3 sm:p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-800/10 rounded-lg sm:rounded-xl hover:shadow-md transition-all duration-300 border border-blue-200/50 dark:border-blue-800/30 hover:scale-105 hover:border-blue-300 dark:hover:border-blue-700"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 group-hover:shadow-lg transition-shadow duration-300">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 group-hover:text-blue-700 text-sm sm:text-base">Manage Leads</div>
              <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-300">Kanban pipeline</div>
            </div>
          </a>

          <a
            href="/properties"
            className="group flex items-center p-3 sm:p-5 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/10 dark:to-green-800/10 rounded-lg sm:rounded-xl hover:shadow-md transition-all duration-300 border border-green-200/50 dark:border-green-800/30 hover:scale-105 hover:border-green-300 dark:hover:border-green-700"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 group-hover:shadow-lg transition-shadow duration-300">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-green-900 dark:text-green-100 group-hover:text-green-700 text-sm sm:text-base">Properties</div>
              <div className="text-xs sm:text-sm text-green-600 dark:text-green-300">Manage listings</div>
            </div>
          </a>

          <a
            href="/calendar"
            className="group flex items-center p-3 sm:p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/10 dark:to-purple-800/10 rounded-lg sm:rounded-xl hover:shadow-md transition-all duration-300 border border-purple-200/50 dark:border-purple-800/30 hover:scale-105 hover:border-purple-300 dark:hover:border-purple-700"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 group-hover:shadow-lg transition-shadow duration-300">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-purple-900 dark:text-purple-100 group-hover:text-purple-700 text-sm sm:text-base">Calendar</div>
              <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-300">Schedule meetings</div>
            </div>
          </a>

          <a
            href="/profile"
            className="group flex items-center p-3 sm:p-5 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/10 dark:to-orange-800/10 rounded-lg sm:rounded-xl hover:shadow-md transition-all duration-300 border border-orange-200/50 dark:border-orange-800/30 hover:scale-105 hover:border-orange-300 dark:hover:border-orange-700"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4 group-hover:shadow-lg transition-shadow duration-300">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-orange-900 dark:text-orange-100 group-hover:text-orange-700 text-sm sm:text-base">Settings</div>
              <div className="text-xs sm:text-sm text-orange-600 dark:text-orange-300">Configure system</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
