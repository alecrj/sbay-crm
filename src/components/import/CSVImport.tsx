"use client";
import React, { useState } from 'react';

interface FieldMapping {
  [key: string]: number | undefined;
}

interface ImportResult {
  totalRows: number;
  imported: number;
  skipped: number;
  duplicates: number;
  errors: number;
  errorDetails?: Array<{ row: number; error: string; email?: string }>;
  duplicateEmails?: string[];
}

const CSVImport: React.FC = () => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    sampleRows: string[][];
  } | null>(null);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const crmFields = [
    { key: 'name', label: 'Name *', required: true },
    { key: 'email', label: 'Email *', required: true },
    { key: 'phone', label: 'Contact (Phone)', required: false },
    { key: 'company', label: 'Business', required: false },
    { key: 'space_requirements', label: 'Sq Ft', required: false },
    { key: 'property_interest', label: 'Property', required: false },
    { key: 'message', label: 'Notes', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'follow_up_date', label: 'Follow Up', required: false },
    { key: 'consultation_date', label: 'Date Shown', required: false },
  ];

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError('');

    // Read and preview the file
    try {
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim()).slice(0, 6); // First 6 lines

      if (lines.length < 2) {
        setError('CSV file must have headers and at least one row of data');
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
      const sampleRows = lines.slice(1, 6).map(line =>
        parseCSVLine(line).map(cell => cell.replace(/^"|"$/g, ''))
      );

      setPreview({ headers, sampleRows });
      setStep(2);
    } catch (err) {
      setError('Failed to read CSV file');
      console.error(err);
    }
  };

  const handleMappingChange = (crmField: string, columnIndex: string) => {
    setMapping(prev => ({
      ...prev,
      [crmField]: columnIndex === '' ? undefined : parseInt(columnIndex)
    }));
  };

  const canProceed = () => {
    return mapping.name !== undefined && mapping.email !== undefined;
  };

  const handleImport = async () => {
    if (!file || !canProceed()) return;

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));
      formData.append('skipDuplicates', skipDuplicates.toString());

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      // Log full results for debugging
      console.log('Import results:', data);

      setImportResult({
        ...data.summary,
        errorDetails: data.results?.errorDetails,
        duplicateEmails: data.results?.duplicateEmails,
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setMapping({});
    setImportResult(null);
    setError('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {/* Step 1: File Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Step 1: Upload CSV File
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Download your Google Sheet as CSV (File → Download → CSV) and upload it here
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer inline-flex flex-col items-center"
            >
              <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Click to upload CSV file
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                CSV files only
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && preview && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Step 2: Map Columns
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Match your CSV columns to CRM fields. Name and Email are required.
            </p>
          </div>

          {/* Preview */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">CSV Preview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {preview.headers.map((header, idx) => (
                      <th key={idx} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {header || `Column ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {preview.sampleRows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                          {cell || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mapping */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Column Mapping</h3>
            {crmFields.map(field => (
              <div key={field.key} className="flex items-center gap-4">
                <label className="w-48 text-sm text-gray-700 dark:text-gray-300">
                  {field.label}
                </label>
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">-- Not Mapped --</option>
                  {preview.headers.map((header, idx) => (
                    <option key={idx} value={idx}>
                      {header || `Column ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Skip duplicate emails (recommended)
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!canProceed() || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Importing...' : 'Import Leads'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && importResult && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Import Complete!
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {importResult.imported}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">Imported</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {importResult.duplicates}
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">Duplicates</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {importResult.errors}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">Errors</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {importResult.totalRows}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Total Rows</div>
            </div>
          </div>

          {/* Error Details */}
          {importResult.errorDetails && importResult.errorDetails.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                Errors ({importResult.errorDetails.length})
              </h3>
              <div className="space-y-2">
                {importResult.errorDetails.map((error, idx) => (
                  <div key={idx} className="text-sm text-red-700 dark:text-red-400">
                    <span className="font-medium">Row {error.row}:</span> {error.error}
                    {error.email && <span className="text-xs"> ({error.email})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Details */}
          {importResult.duplicateEmails && importResult.duplicateEmails.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                Skipped Duplicates ({importResult.duplicateEmails.length})
              </h3>
              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                {importResult.duplicateEmails.slice(0, 5).join(', ')}
                {importResult.duplicateEmails.length > 5 && ` and ${importResult.duplicateEmails.length - 5} more...`}
              </div>
            </div>
          )}

          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
};

export default CSVImport;
