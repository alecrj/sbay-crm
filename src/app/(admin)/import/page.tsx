"use client";

import GoogleSheetsImport from '@/components/import/GoogleSheetsImport';

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Import Leads from Google Sheets
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Import leads directly from your Google Sheets spreadsheet into the CRM
        </p>
      </div>

      <GoogleSheetsImport />
    </div>
  );
}
