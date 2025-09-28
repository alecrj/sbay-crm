import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PropertyCalendarsOverview from "@/components/property-calendars/PropertyCalendarsOverview";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Property Calendars | Shallow Bay Advisors CRM",
  description:
    "Manage booking calendars and availability for each property",
};

export default function PropertyCalendarsPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Property Calendars" />
      <PropertyCalendarsOverview />
    </div>
  );
}