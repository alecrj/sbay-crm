"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface BusinessInfo {
  company_name: string;
  business_type: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  office_address: string;
  business_hours: string;
}

export default function BusinessSettings() {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    company_name: "Shallow Bay Advisors",
    business_type: "Commercial Real Estate",
    email: "admin@shallowbayadvisors.com",
    phone: "(305) 555-0123",
    website: "https://shallowbayadvisors.com",
    description: "Professional Commercial Real Estate Services",
    office_address: "Miami, FL",
    business_hours: "Monday - Friday: 9AM - 6PM"
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadBusinessSettings();
  }, []);

  const loadBusinessSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'company_name', 'business_type', 'contact_email', 'contact_phone',
          'website', 'company_description', 'office_address', 'business_hours'
        ]);

      if (error) throw error;

      if (data && data.length > 0) {
        const settings = data.reduce((acc, setting) => {
          let key = setting.key;
          // Map database keys to component keys
          if (key === 'contact_email') key = 'email';
          if (key === 'contact_phone') key = 'phone';
          if (key === 'company_description') key = 'description';

          acc[key] = setting.value.replace(/"/g, ''); // Remove quotes from JSON strings
          return acc;
        }, {} as any);

        setBusinessInfo(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error loading business settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);

    try {
      // Prepare settings data for database
      const settingsToUpdate = [
        { key: 'company_name', value: `"${businessInfo.company_name}"` },
        { key: 'business_type', value: `"${businessInfo.business_type}"` },
        { key: 'contact_email', value: `"${businessInfo.email}"` },
        { key: 'contact_phone', value: `"${businessInfo.phone}"` },
        { key: 'website', value: `"${businessInfo.website}"` },
        { key: 'company_description', value: `"${businessInfo.description}"` },
        { key: 'office_address', value: `"${businessInfo.office_address}"` },
        { key: 'business_hours', value: `"${businessInfo.business_hours}"` }
      ];

      // Update each setting
      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            description: `Business ${setting.key.replace('_', ' ')}`,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (error) throw error;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving business settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Business Information
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Update your company details and contact information
          </p>
        </div>
        {saved && (
          <div className="flex items-center text-green-600 dark:text-green-400">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved!
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Company Name
          </label>
          <input
            type="text"
            value={businessInfo.company_name}
            onChange={(e) => handleInputChange('company_name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Business Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Type
          </label>
          <input
            type="text"
            value={businessInfo.business_type}
            onChange={(e) => handleInputChange('business_type', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={businessInfo.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={businessInfo.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Website URL
          </label>
          <input
            type="url"
            value={businessInfo.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Office Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Office Address
          </label>
          <input
            type="text"
            value={businessInfo.office_address}
            onChange={(e) => handleInputChange('office_address', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Business Hours */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Hours
          </label>
          <input
            type="text"
            value={businessInfo.business_hours}
            onChange={(e) => handleInputChange('business_hours', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., Monday - Friday: 9AM - 6PM"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Company Description
          </label>
          <textarea
            value={businessInfo.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"
            placeholder="Brief description of your business..."
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}