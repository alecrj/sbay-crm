import CalendarManager from "@/components/calendar/CalendarManager";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Calendar & Appointments | Shallow Bay Advisors CRM",
  description:
    "Manage appointments and sync with Google Calendar for Shallow Bay Advisors CRM",
  // other metadata
};
export default function page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Calendar & Appointments" />
      <CalendarManager />
    </div>
  );
}
