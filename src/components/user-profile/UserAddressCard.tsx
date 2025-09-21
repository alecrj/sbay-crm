"use client";
import React, { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { supabase } from "../../lib/supabase";

export default function UserAddressCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    country: "United States",
    city_state: "Miami, Florida",
    service_areas: "Miami-Dade, Broward, Palm Beach",
    license_number: "FL CRE License #12345"
  });

  useEffect(() => {
    loadAddressInfo();
  }, []);

  const loadAddressInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['country', 'city_state', 'service_areas', 'license_number']);

      console.log('Loading address info:', { data, error }); // Debug log

      if (error) {
        console.error('Database error loading address info:', error);
        return; // Don't throw error for database issues
      }

      if (data && data.length > 0) {
        const settings = data.reduce((acc, setting) => {
          // Handle both string and already-parsed values
          let value = setting.value;
          if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1); // Remove quotes
          }
          acc[setting.key] = value || '';
          return acc;
        }, {} as any);

        console.log('Parsed address settings:', settings); // Debug log
        setFormData(prev => ({ ...prev, ...settings }));
      } else {
        console.log('No address settings found, using defaults');
        // Keep default values if no settings exist yet
      }
    } catch (error) {
      console.error('Unexpected error loading address info:', error);
      // Don't break the UI for loading issues
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const settingsToUpdate = [
        { key: 'country', value: formData.country },
        { key: 'city_state', value: formData.city_state },
        { key: 'service_areas', value: formData.service_areas },
        { key: 'license_number', value: formData.license_number }
      ];

      console.log('Saving address settings:', settingsToUpdate); // Debug log

      for (const setting of settingsToUpdate) {
        const { data, error } = await supabase
          .from('settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            description: `Business ${setting.key.replace('_', ' ')}`,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          })
          .select();

        console.log('Address upsert result:', { data, error }); // Debug log

        if (error) {
          console.error('Address upsert error:', error);
          throw error;
        }
      }

      // Reload the data after saving to ensure it's properly synced
      await loadAddressInfo();

      closeModal();
      console.log('Address settings saved successfully'); // Debug log
    } catch (error) {
      console.error('Error saving address info:', error);
      alert(`Failed to save changes: ${error.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Business Address
            </h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Country
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formData.country}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  City/State
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formData.city_state}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  Service Areas
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formData.service_areas}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                  License
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {formData.license_number}
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={openModal}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Address
          </Button>
        </div>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Address
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your details to keep your profile up-to-date.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="px-2 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div>
                  <Label>Country</Label>
                  <Input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  />
                </div>

                <div>
                  <Label>City/State</Label>
                  <Input
                    type="text"
                    value={formData.city_state}
                    onChange={(e) => handleInputChange('city_state', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Service Areas</Label>
                  <Input
                    type="text"
                    value={formData.service_areas}
                    onChange={(e) => handleInputChange('service_areas', e.target.value)}
                  />
                </div>

                <div>
                  <Label>License Number</Label>
                  <Input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) => handleInputChange('license_number', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
