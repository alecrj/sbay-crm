import type { Metadata } from "next";
import LeadKanban from "@/components/leads/LeadKanban";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React from "react";

export const metadata: Metadata = {
  title: "Lead Management | Shallow Bay Advisors CRM",
  description: "Manage leads and track sales pipeline",
};

export default function Leads() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Lead Management" />
      <LeadKanban />
    </div>
  );
}