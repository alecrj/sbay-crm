"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import BrowserNotifications from "@/components/notifications/BrowserNotifications";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <ProtectedRoute>
      <BrowserNotifications>
        <div className="min-h-screen xl:flex">
          {/* Sidebar and Backdrop - Hidden on mobile */}
          <div className="hidden lg:block">
            <AppSidebar />
            <Backdrop />
          </div>

          {/* Main Content Area */}
          <div
            className={`flex-1 transition-all duration-300 ease-in-out ${
              isMobileOpen ? "ml-0" : "lg:ml-[90px] xl:ml-[290px]"
            }`}
          >
            {/* Header - Hidden on mobile below lg */}
            <div className="hidden lg:block">
              <AppHeader />
            </div>

            {/* Mobile Header */}
            <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div className="flex items-center">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  CRM Dashboard
                </h1>
              </div>
            </div>

            {/* Page Content with mobile bottom padding */}
            <div className="p-3 mx-auto max-w-7xl sm:p-4 lg:p-6 pb-20 lg:pb-6">
              {children}
            </div>
          </div>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />
        </div>
      </BrowserNotifications>
    </ProtectedRoute>
  );
}
