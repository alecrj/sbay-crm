"use client";
import React, { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { supabase } from "../../lib/supabase";

export default function UserInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "Shallow Bay Advisors",
    business_type: "Commercial Real Estate",
    email: "admin@shallowbayadvisors.com",
    phone: "(305) 555-0123",
    description: "Professional Commercial Real Estate Services"
  });

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['company_name', 'business_type', 'contact_email', 'contact_phone', 'company_description']);

      if (error) throw error;

      if (data && data.length > 0) {
        const settings = data.reduce((acc, setting) => {
          let key = setting.key;
          if (key === 'contact_email') key = 'email';
          if (key === 'contact_phone') key = 'phone';
          if (key === 'company_description') key = 'description';

          acc[key] = setting.value.replace(/"/g, '');
          return acc;
        }, {} as any);

        setFormData(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const settingsToUpdate = [
        { key: 'company_name', value: `"${formData.company_name}"` },
        { key: 'business_type', value: `"${formData.business_type}"` },
        { key: 'contact_email', value: `"${formData.email}"` },
        { key: 'contact_phone', value: `"${formData.phone}"` },
        { key: 'company_description', value: `"${formData.description}"` }
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            description: `Company ${setting.key.replace('_', ' ')}`,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (error) throw error;
      }

      closeModal();
      window.location.reload(); // Refresh to show updated data
    } catch (error) {
      console.error('Error saving company info:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Company Information
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Company Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Shallow Bay Advisors
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Business Type
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Commercial Real Estate
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Email address
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                admin@shallowbayadvisors.com
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Phone
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                (305) 555-0123
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Description
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Professional Commercial Real Estate Services
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
          Edit Company Info
        </Button>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Company Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your company details to keep your profile up-to-date.
            </p>
          </div>
          <form className="flex flex-col">
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Contact Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div>
                    <Label>Website</Label>
                    <Input
                      type="text"
                      value="https://shallowbayadvisors.com"
                      readOnly
                    />
                  </div>

                  <div>
                    <Label>Main Email</Label>
                    <Input
                      type="text"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Business Address</Label>
                    <Input
                      type="text"
                      value="Miami, FL"
                      readOnly
                    />
                  </div>
                </div>
              </div>
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Company Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>Company Name</Label>
                    <Input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Business Type</Label>
                    <Input
                      type="text"
                      value={formData.business_type}
                      onChange={(e) => handleInputChange('business_type', e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email Address</Label>
                    <Input
                      type="text"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone</Label>
                    <Input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Input
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>
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
    </div>
  );
}
