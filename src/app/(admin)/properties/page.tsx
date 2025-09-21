import type { Metadata } from "next";
import PropertyList from "@/components/properties/PropertyList";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React from "react";

export const metadata: Metadata = {
  title: "Properties | Shallow Bay Advisors CRM",
  description: "Manage commercial real estate properties",
};

export default function Properties() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Properties" />
      <PropertyList />
    </div>
  );
}