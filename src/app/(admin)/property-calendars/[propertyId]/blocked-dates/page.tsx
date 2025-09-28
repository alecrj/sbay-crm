import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BlockedDatesManager from "@/components/property-calendars/BlockedDatesManager";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Blocked Dates Management | Shallow Bay Advisors CRM",
  description:
    "Manage blocked dates and unavailable periods for property bookings",
};

interface BlockedDatesPageProps {
  params: {
    propertyId: string;
  };
}

export default function BlockedDatesPage({ params }: BlockedDatesPageProps) {
  return (
    <div>
      <PageBreadcrumb pageTitle="Blocked Dates Management" />
      <BlockedDatesManager propertyId={params.propertyId} />
    </div>
  );
}