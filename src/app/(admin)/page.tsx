import type { Metadata } from "next";
import React from "react";
import CRMMetrics from "@/components/crm/CRMMetrics";
import RecentLeads from "@/components/crm/RecentLeads";
import UpcomingAppointments from "@/components/crm/UpcomingAppointments";
import LeadPipelineSummary from "@/components/crm/LeadPipelineSummary";

export const metadata: Metadata = {
  title: "Dashboard | Shallow Bay Advisors CRM",
  description: "Commercial Real Estate CRM Dashboard for Shallow Bay Advisors",
};

export default function CRMDashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl shadow-xl text-white p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-blue-100 text-lg">Welcome back to your CRM</p>
              <div className="flex items-center gap-4 text-sm text-blue-200 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  System Online
                </div>
                <div className="text-blue-300">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/invitations"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-2 border border-white/20 hover:border-white/30 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Invite User
              </a>
              <div className="hidden lg:block">
                <div className="w-20 h-20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                  <svg className="w-10 h-10 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Pipeline - spans 1 column */}
        <div className="lg:col-span-1">
          <LeadPipelineSummary />
        </div>

        {/* Recent Leads - spans 2 columns */}
        <div className="lg:col-span-2">
          <RecentLeads />
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div>
        <UpcomingAppointments />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quick Actions</h3>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/leads"
            className="group flex items-center p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/10 dark:to-blue-800/10 rounded-xl hover:shadow-md transition-all duration-300 border border-blue-200/50 dark:border-blue-800/30 hover:scale-105 hover:border-blue-300 dark:hover:border-blue-700"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4 group-hover:shadow-lg transition-shadow duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 group-hover:text-blue-700">Manage Leads</div>
              <div className="text-sm text-blue-600 dark:text-blue-300">Kanban pipeline</div>
            </div>
          </a>

          <a
            href="/properties"
            className="group flex items-center p-5 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/10 dark:to-green-800/10 rounded-xl hover:shadow-md transition-all duration-300 border border-green-200/50 dark:border-green-800/30 hover:scale-105 hover:border-green-300 dark:hover:border-green-700"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mr-4 group-hover:shadow-lg transition-shadow duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-green-900 dark:text-green-100 group-hover:text-green-700">Properties</div>
              <div className="text-sm text-green-600 dark:text-green-300">Manage listings</div>
            </div>
          </a>

          <a
            href="/calendar"
            className="group flex items-center p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/10 dark:to-purple-800/10 rounded-xl hover:shadow-md transition-all duration-300 border border-purple-200/50 dark:border-purple-800/30 hover:scale-105 hover:border-purple-300 dark:hover:border-purple-700"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-4 group-hover:shadow-lg transition-shadow duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-purple-900 dark:text-purple-100 group-hover:text-purple-700">Calendar</div>
              <div className="text-sm text-purple-600 dark:text-purple-300">Schedule meetings</div>
            </div>
          </a>

          <a
            href="/profile"
            className="group flex items-center p-5 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/10 dark:to-orange-800/10 rounded-xl hover:shadow-md transition-all duration-300 border border-orange-200/50 dark:border-orange-800/30 hover:scale-105 hover:border-orange-300 dark:hover:border-orange-700"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mr-4 group-hover:shadow-lg transition-shadow duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-orange-900 dark:text-orange-100 group-hover:text-orange-700">Settings</div>
              <div className="text-sm text-orange-600 dark:text-orange-300">Configure CRM</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
