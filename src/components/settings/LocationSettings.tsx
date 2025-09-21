"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface LocationData {
  counties: string[];
  states: string[];
  service_areas: string[];
}

export default function LocationSettings() {
  const [locationData, setLocationData] = useState<LocationData>({
    counties: ["Miami-Dade", "Broward", "Palm Beach"],
    states: ["Florida"],
    service_areas: ["Miami-Dade County", "Broward County", "Palm Beach County"]
  });

  const [newCounty, setNewCounty] = useState("");
  const [newState, setNewState] = useState("");
  const [newServiceArea, setNewServiceArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadLocationSettings();
  }, []);

  const loadLocationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['service_counties', 'service_states', 'service_areas']);

      if (error) throw error;

      if (data && data.length > 0) {
        const settings = data.reduce((acc, setting) => {
          try {
            const value = JSON.parse(setting.value);
            if (setting.key === 'service_counties') acc.counties = value;
            if (setting.key === 'service_states') acc.states = value;
            if (setting.key === 'service_areas') acc.service_areas = value;
          } catch (e) {
            console.error('Error parsing setting:', setting.key, e);
          }
          return acc;
        }, {} as any);

        setLocationData(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error loading location settings:', error);
    }
  };

  const saveLocationSettings = async () => {
    setLoading(true);
    setSaved(false);

    try {
      const settingsToUpdate = [
        {
          key: 'service_counties',
          value: JSON.stringify(locationData.counties),
          description: 'Counties where services are provided'
        },
        {
          key: 'service_states',
          value: JSON.stringify(locationData.states),
          description: 'States where services are provided'
        },
        {
          key: 'service_areas',
          value: JSON.stringify(locationData.service_areas),
          description: 'Specific service areas and regions'
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
      console.error('Error saving location settings:', error);
      alert('Failed to save location settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addCounty = () => {
    if (newCounty.trim() && !locationData.counties.includes(newCounty.trim())) {
      setLocationData(prev => ({
        ...prev,
        counties: [...prev.counties, newCounty.trim()]
      }));
      setNewCounty("");
    }
  };

  const removeCounty = (county: string) => {
    setLocationData(prev => ({
      ...prev,
      counties: prev.counties.filter(c => c !== county)
    }));
  };

  const addState = () => {
    if (newState.trim() && !locationData.states.includes(newState.trim())) {
      setLocationData(prev => ({
        ...prev,
        states: [...prev.states, newState.trim()]
      }));
      setNewState("");
    }
  };

  const removeState = (state: string) => {
    setLocationData(prev => ({
      ...prev,
      states: prev.states.filter(s => s !== state)
    }));
  };

  const addServiceArea = () => {
    if (newServiceArea.trim() && !locationData.service_areas.includes(newServiceArea.trim())) {
      setLocationData(prev => ({
        ...prev,
        service_areas: [...prev.service_areas, newServiceArea.trim()]
      }));
      setNewServiceArea("");
    }
  };

  const removeServiceArea = (area: string) => {
    setLocationData(prev => ({
      ...prev,
      service_areas: prev.service_areas.filter(a => a !== area)
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Service Locations
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage counties, states, and service areas
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
        {/* Counties */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Counties</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {locationData.counties.map((county) => (
              <span
                key={county}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {county}
                <button
                  onClick={() => removeCounty(county)}
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
              value={newCounty}
              onChange={(e) => setNewCounty(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCounty()}
              placeholder="Add new county"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addCounty}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* States */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">States</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {locationData.states.map((state) => (
              <span
                key={state}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                {state}
                <button
                  onClick={() => removeState(state)}
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
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addState()}
              placeholder="Add new state"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addState}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Service Areas */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Service Areas</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {locationData.service_areas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
              >
                {area}
                <button
                  onClick={() => removeServiceArea(area)}
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
              value={newServiceArea}
              onChange={(e) => setNewServiceArea(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addServiceArea()}
              placeholder="Add new service area"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addServiceArea}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={saveLocationSettings}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}