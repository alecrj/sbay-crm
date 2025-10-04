"use client";

import CSVImport from '@/components/import/CSVImport';

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Import Leads from CSV
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload a CSV file to import leads into the CRM. Download your Google Sheet as CSV first (File → Download → CSV).
        </p>
      </div>

      <CSVImport />
    </div>
  );
}
