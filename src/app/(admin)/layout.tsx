"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import BrowserNotifications from "@/components/notifications/BrowserNotifications";
import DarkModeToggle from "@/components/DarkModeToggle";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signOut } = useAuth();

  return (
    <ProtectedRoute>
      <BrowserNotifications>
        <div className="min-h-screen">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center hover:opacity-80 transition-opacity">
                {/* Dark logo for light mode */}
                <img
                  src="/images/sbalogo.png"
                  alt="Shallow Bay Advisors"
                  className="h-15 w-auto dark:hidden"
                />
                {/* White logo for dark mode */}
                <img
                  src="/images/sba-white.png"
                  alt="Shallow Bay Advisors"
                  className="h-15 w-auto hidden dark:block"
                />
              </a>
              <div className="flex items-center gap-2">
                <DarkModeToggle />
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Settings"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </a>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Page Content with bottom padding for nav */}
          <div className="p-3 mx-auto max-w-7xl sm:p-4 lg:p-6 pb-20">
            {children}
          </div>

          {/* Bottom Navigation */}
          <MobileBottomNav />
        </div>
      </BrowserNotifications>
    </ProtectedRoute>
  );
}
