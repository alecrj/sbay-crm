import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PropertyCalendarManager from "@/components/property-calendars/PropertyCalendarManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Property Calendar Management | Shallow Bay Advisors CRM",
  description:
    "Manage booking schedule and availability for individual property",
};

interface PropertyCalendarPageProps {
  params: {
    propertyId: string;
  };
}

export default function PropertyCalendarPage({ params }: PropertyCalendarPageProps) {
  return (
    <div>
      <PageBreadcrumb pageTitle="Property Calendar Management" />
      <PropertyCalendarManager propertyId={params.propertyId} />
    </div>
  );
}