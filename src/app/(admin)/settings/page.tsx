import type { Metadata } from "next";
import React from "react";
import BusinessSettings from "@/components/settings/BusinessSettings";
import LocationSettings from "@/components/settings/LocationSettings";
import PropertySettings from "@/components/settings/PropertySettings";

export const metadata: Metadata = {
  title: "Settings | Shallow Bay Advisors CRM",
  description: "Manage business settings, locations, and system configuration",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your business information and system preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Information */}
        <div className="lg:col-span-2">
          <BusinessSettings />
        </div>

        {/* Location Settings */}
        <LocationSettings />

        {/* Property Settings */}
        <PropertySettings />
      </div>
    </div>
  );
}