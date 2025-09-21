"use client";
import React, { useState } from 'react';

interface FieldMapping {
  [key: string]: number | undefined;
}

interface ImportResult {
  totalRows: number;
  validLeads: number;
  imported: number;
  skipped: number;
  duplicates: number;
  errors: number;
}

const GoogleSheetsImport: React.FC = () => {
  const [step, setStep] = useState(1);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [availableSheets, setAvailableSheets] = useState<Array<{ id: number; title: string; index: number }>>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [preview, setPreview] = useState<{
    headers: string[];
    sampleRows: string[][];
    totalRows: number;
  } | null>(null);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [importSettings, setImportSettings] = useState({
    skipDuplicates: true,
    sendNotifications: false,
    startRow: 0,
    endRow: undefined as number | undefined,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const crmFields = [
    { key: 'name', label: 'Name *', required: true },
    { key: 'email', label: 'Email *', required: true },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'company', label: 'Company', required: false },
    { key: 'property_interest', label: 'Property Interest', required: false },
    { key: 'space_requirements', label: 'Space Requirements', required: false },
    { key: 'budget', label: 'Budget', required: false },
    { key: 'timeline', label: 'Timeline', required: false },
    { key: 'message', label: 'Message/Notes', required: false },
    { key: 'source', label: 'Source', required: false },
    { key: 'priority', label: 'Priority', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'type', label: 'Type', required: false },
    { key: 'consultation_date', label: 'Consultation Date', required: false },
    { key: 'consultation_time', label: 'Consultation Time', required: false },
    { key: 'follow_up_date', label: 'Follow-up Date', required: false },
  ];

  const extractSpreadsheetId = (url: string): string => {
    // Extract spreadsheet ID from Google Sheets URL
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  const handleStep1Submit = async () => {
    setIsLoading(true);
    setError('');

    try {
      const id = extractSpreadsheetId(spreadsheetId);
      const response = await fetch('/api/import/sheets/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to access spreadsheet');
      }

      setAvailableSheets(data.availableSheets || []);
      setSpreadsheetId(id);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access spreadsheet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!selectedSheet) {
      setError('Please select a sheet');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/import/sheets/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          sheetName: selectedSheet,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview sheet');
      }

      setPreview(data.preview);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview sheet');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    // Validate required mappings
    const requiredFields = crmFields.filter(f => f.required);
    const missingRequired = requiredFields.filter(f => mapping[f.key] === undefined);

    if (missingRequired.length > 0) {
      setError(`Please map required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/import/sheets/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          sheetName: selectedSheet,
          mapping,
          importSettings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import data');
      }

      setImportResult(data.summary);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setIsLoading(false);
    }
  };

  const resetImport = () => {
    setStep(1);
    setSpreadsheetId('');
    setAvailableSheets([]);
    setSelectedSheet('');
    setPreview(null);
    setMapping({});
    setImportResult(null);
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Import from Google Sheets
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Import leads from your existing Google Sheets into the CRM
          </p>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                  }`}
                >
                  {stepNum}
                </div>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {stepNum === 1 && 'Spreadsheet'}
                  {stepNum === 2 && 'Sheet Selection'}
                  {stepNum === 3 && 'Field Mapping'}
                  {stepNum === 4 && 'Import Results'}
                </span>
                {stepNum < 4 && (
                  <div className="w-8 h-px bg-gray-300 dark:bg-gray-600 ml-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {/* Step 1: Spreadsheet URL */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Google Sheets URL or Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit or just the ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Before importing:
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Ensure your Google Sheet is shared with your Google account</li>
                  <li>• Make sure the first row contains column headers</li>
                  <li>• Required fields: Name and Email columns must be present</li>
                  <li>• The sheet should contain lead contact information</li>
                </ul>
              </div>
              <button
                onClick={handleStep1Submit}
                disabled={!spreadsheetId.trim() || isLoading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Accessing...' : 'Access Spreadsheet'}
              </button>
            </div>
          )}

          {/* Step 2: Sheet Selection */}
          {step === 2 && availableSheets.length > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Sheet to Import
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Choose a sheet...</option>
                  {availableSheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.title}>
                      {sheet.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={handleStep2Submit}
                  disabled={!selectedSheet || isLoading}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Loading...' : 'Preview Sheet'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Field Mapping */}
          {step === 3 && preview && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Map Sheet Columns to CRM Fields
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Found {preview.totalRows} rows in the sheet. Map your columns to CRM fields below.
                </p>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {preview.headers.map((header, index) => (
                        <th
                          key={index}
                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          {header || `Column ${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {preview.sampleRows.slice(0, 3).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-3 py-2 text-sm text-gray-900 dark:text-gray-300 max-w-32 truncate"
                          >
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Field Mapping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {crmFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {field.label}
                    </label>
                    <select
                      value={mapping[field.key] !== undefined ? mapping[field.key] : ''}
                      onChange={(e) =>
                        setMapping(prev => ({
                          ...prev,
                          [field.key]: e.target.value === '' ? undefined : parseInt(e.target.value)
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                    >
                      <option value="">-- Select Column --</option>
                      {preview.headers.map((header, index) => (
                        <option key={index} value={index}>
                          {header || `Column ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Import Settings */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Import Settings
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={importSettings.skipDuplicates}
                      onChange={(e) => setImportSettings(prev => ({ ...prev, skipDuplicates: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Skip duplicate emails
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={importSettings.sendNotifications}
                      onChange={(e) => setImportSettings(prev => ({ ...prev, sendNotifications: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Send notifications for new leads
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Importing...' : 'Import Leads'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Import Completed!
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {importResult.totalRows}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Total Rows</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importResult.imported}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">Imported</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {importResult.duplicates}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">Duplicates</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {importResult.errors}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">Errors</div>
                </div>
              </div>

              <button
                onClick={resetImport}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Import Another Sheet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetsImport;