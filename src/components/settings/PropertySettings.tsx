"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface PropertyConfig {
  property_types: string[];
  size_ranges: string[];
  price_ranges: string[];
  lease_terms: string[];
}

export default function PropertySettings() {
  const [propertyConfig, setPropertyConfig] = useState<PropertyConfig>({
    property_types: ["Warehouse", "Office", "Industrial", "Flex Space", "Distribution Center"],
    size_ranges: ["500-2,000 SF", "2,000-5,000 SF", "5,000-10,000 SF", "10,000-25,000 SF", "25,000-50,000 SF", "50,000+ SF"],
    price_ranges: ["$1,000-3,000/month", "$3,000-5,000/month", "$5,000-10,000/month", "$10,000-20,000/month", "$20,000-50,000/month", "$50,000+/month"],
    lease_terms: ["Month-to-Month", "6 Months", "1 Year", "2 Years", "3 Years", "5+ Years"]
  });

  const [newPropertyType, setNewPropertyType] = useState("");
  const [newSizeRange, setNewSizeRange] = useState("");
  const [newPriceRange, setNewPriceRange] = useState("");
  const [newLeaseTerm, setNewLeaseTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPropertySettings();
  }, []);

  const loadPropertySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['property_types', 'size_ranges', 'price_ranges', 'lease_terms']);

      if (error) throw error;

      if (data && data.length > 0) {
        const settings = data.reduce((acc, setting) => {
          try {
            const value = JSON.parse(setting.value);
            acc[setting.key] = value;
          } catch (e) {
            console.error('Error parsing setting:', setting.key, e);
          }
          return acc;
        }, {} as any);

        setPropertyConfig(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error loading property settings:', error);
    }
  };

  const savePropertySettings = async () => {
    setLoading(true);
    setSaved(false);

    try {
      const settingsToUpdate = [
        {
          key: 'property_types',
          value: JSON.stringify(propertyConfig.property_types),
          description: 'Available property types for listings'
        },
        {
          key: 'size_ranges',
          value: JSON.stringify(propertyConfig.size_ranges),
          description: 'Property size ranges for filtering'
        },
        {
          key: 'price_ranges',
          value: JSON.stringify(propertyConfig.price_ranges),
          description: 'Price ranges for property filtering'
        },
        {
          key: 'lease_terms',
          value: JSON.stringify(propertyConfig.lease_terms),
          description: 'Available lease term options'
        }
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            description: setting.description,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (error) throw error;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving property settings:', error);
      alert('Failed to save property settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addPropertyType = () => {
    if (newPropertyType.trim() && !propertyConfig.property_types.includes(newPropertyType.trim())) {
      setPropertyConfig(prev => ({
        ...prev,
        property_types: [...prev.property_types, newPropertyType.trim()]
      }));
      setNewPropertyType("");
    }
  };

  const removePropertyType = (type: string) => {
    setPropertyConfig(prev => ({
      ...prev,
      property_types: prev.property_types.filter(t => t !== type)
    }));
  };

  const addSizeRange = () => {
    if (newSizeRange.trim() && !propertyConfig.size_ranges.includes(newSizeRange.trim())) {
      setPropertyConfig(prev => ({
        ...prev,
        size_ranges: [...prev.size_ranges, newSizeRange.trim()]
      }));
      setNewSizeRange("");
    }
  };

  const removeSizeRange = (range: string) => {
    setPropertyConfig(prev => ({
      ...prev,
      size_ranges: prev.size_ranges.filter(r => r !== range)
    }));
  };

  const addPriceRange = () => {
    if (newPriceRange.trim() && !propertyConfig.price_ranges.includes(newPriceRange.trim())) {
      setPropertyConfig(prev => ({
        ...prev,
        price_ranges: [...prev.price_ranges, newPriceRange.trim()]
      }));
      setNewPriceRange("");
    }
  };

  const removePriceRange = (range: string) => {
    setPropertyConfig(prev => ({
      ...prev,
      price_ranges: prev.price_ranges.filter(r => r !== range)
    }));
  };

  const addLeaseTerm = () => {
    if (newLeaseTerm.trim() && !propertyConfig.lease_terms.includes(newLeaseTerm.trim())) {
      setPropertyConfig(prev => ({
        ...prev,
        lease_terms: [...prev.lease_terms, newLeaseTerm.trim()]
      }));
      setNewLeaseTerm("");
    }
  };

  const removeLeaseTerm = (term: string) => {
    setPropertyConfig(prev => ({
      ...prev,
      lease_terms: prev.lease_terms.filter(t => t !== term)
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Property Configuration
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage property types and filter options
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

      <div className="space-y-6">
        {/* Property Types */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Property Types</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {propertyConfig.property_types.map((type) => (
              <span
                key={type}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {type}
                <button
                  onClick={() => removePropertyType(type)}
                  className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPropertyType}
              onChange={(e) => setNewPropertyType(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPropertyType()}
              placeholder="Add property type"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addPropertyType}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Size Ranges */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Size Ranges</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {propertyConfig.size_ranges.map((range) => (
              <span
                key={range}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                {range}
                <button
                  onClick={() => removeSizeRange(range)}
                  className="ml-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSizeRange}
              onChange={(e) => setNewSizeRange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSizeRange()}
              placeholder="e.g., 100,000-200,000 SF"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addSizeRange}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Price Ranges */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Price Ranges</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {propertyConfig.price_ranges.map((range) => (
              <span
                key={range}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
              >
                {range}
                <button
                  onClick={() => removePriceRange(range)}
                  className="ml-1 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPriceRange}
              onChange={(e) => setNewPriceRange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPriceRange()}
              placeholder="e.g., $100,000-200,000/month"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addPriceRange}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Lease Terms */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Lease Terms</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {propertyConfig.lease_terms.map((term) => (
              <span
                key={term}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
              >
                {term}
                <button
                  onClick={() => removeLeaseTerm(term)}
                  className="ml-1 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newLeaseTerm}
              onChange={(e) => setNewLeaseTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addLeaseTerm()}
              placeholder="e.g., 10 Years"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addLeaseTerm}
              className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={savePropertySettings}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}