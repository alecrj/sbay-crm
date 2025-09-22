'use client';

import React, { useState } from 'react';

export default function TestAPIPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string>('');

  const testEndpoint = async (endpoint: string, method: string = 'GET', data?: any) => {
    setLoading(endpoint);
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`/api/public/${endpoint}`, options);
      const result = await response.json();

      setResults(prev => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          data: result,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [endpoint]: {
          status: 'Error',
          data: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } finally {
      setLoading('');
    }
  };

  const testLeadSubmission = () => {
    testEndpoint('leads', 'POST', {
      name: 'Test User',
      email: 'test@example.com',
      phone: '(305) 123-4567',
      company: 'Test Company',
      property_interest: 'Warehouse',
      message: 'This is a test submission from the API test page',
      source: 'api-test'
    });
  };

  const testAppointmentBooking = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];

    testEndpoint('appointments', 'POST', {
      name: 'Test Appointment',
      email: 'appointment@example.com',
      phone: '(305) 987-6543',
      appointmentDate: dateString,
      appointmentTime: '10:00',
      location: 'Office Meeting',
      message: 'Test appointment booking from API test page'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🧪 CRM API Testing Page
          </h1>
          <p className="text-gray-600 mb-6">
            Test your CRM's public API endpoints to verify website integration.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => testEndpoint('properties?limit=5')}
              disabled={loading === 'properties?limit=5'}
              className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading === 'properties?limit=5' ? 'Testing...' : '🏢 Test Properties API'}
            </button>

            <button
              onClick={testLeadSubmission}
              disabled={loading === 'leads'}
              className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading === 'leads' ? 'Testing...' : '📝 Test Lead Submission'}
            </button>

            <button
              onClick={testAppointmentBooking}
              disabled={loading === 'appointments'}
              className="p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading === 'appointments' ? 'Testing...' : '📅 Test Appointment Booking'}
            </button>

            <button
              onClick={() => testEndpoint('appointments/availability?date=' + new Date().toISOString().split('T')[0])}
              disabled={loading === 'appointments/availability'}
              className="p-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              {loading === 'appointments/availability' ? 'Testing...' : '⏰ Test Availability'}
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-yellow-800 mb-2">💡 How to Use</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Click each button to test the corresponding API endpoint</li>
              <li>• Results will appear below with status codes and response data</li>
              <li>• Successful tests mean your website integration will work</li>
              <li>• Check the CRM dashboard to see if test data appears</li>
            </ul>
          </div>
        </div>

        {/* Results */}
        {Object.keys(results).length > 0 && (
          <div className="space-y-4">
            {Object.entries(results).map(([endpoint, result]: [string, any]) => (
              <div key={endpoint} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {endpoint}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.status === 200 || result.status === 201
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    Status: {result.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Tested at: {result.timestamp}
                </p>
                <pre className="bg-gray-50 rounded p-4 text-sm overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-medium text-blue-800 mb-2">🚀 Next Steps</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>After testing successfully:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Copy the integration code from the WEBSITE_INTEGRATION_GUIDE.md</li>
              <li>Update your website's contact forms to use these endpoints</li>
              <li>Replace the test data with your actual form fields</li>
              <li>Update the API URL to your production CRM domain</li>
              <li>Test on your live website</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}