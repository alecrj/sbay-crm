"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface NotificationSettingsProps {
  onSave?: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onSave }) => {
  const [settings, setSettings] = useState({
    emailEnabled: false,
    smsEnabled: false,
    emailProvider: 'resend',
    smsProvider: 'twilio',
    fromEmail: '',
    fromName: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'notifications_email_enabled',
          'notifications_sms_enabled',
          'notifications_email_provider',
          'notifications_sms_provider',
          'notifications_from_email',
          'notifications_from_name'
        ]);

      if (error) throw error;

      const settingsMap: Record<string, any> = {};
      data?.forEach(item => {
        const value = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
        settingsMap[item.key] = value;
      });

      setSettings({
        emailEnabled: settingsMap.notifications_email_enabled || false,
        smsEnabled: settingsMap.notifications_sms_enabled || false,
        emailProvider: settingsMap.notifications_email_provider || 'resend',
        smsProvider: settingsMap.notifications_sms_provider || 'twilio',
        fromEmail: settingsMap.notifications_from_email || '',
        fromName: settingsMap.notifications_from_name || '',
      });
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const updates = [
        { key: 'notifications_email_enabled', value: JSON.stringify(settings.emailEnabled) },
        { key: 'notifications_sms_enabled', value: JSON.stringify(settings.smsEnabled) },
        { key: 'notifications_email_provider', value: JSON.stringify(settings.emailProvider) },
        { key: 'notifications_sms_provider', value: JSON.stringify(settings.smsProvider) },
        { key: 'notifications_from_email', value: JSON.stringify(settings.fromEmail) },
        { key: 'notifications_from_name', value: JSON.stringify(settings.fromName) },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert([update], { onConflict: 'key' });

        if (error) throw error;
      }

      onSave?.();
      alert('Notification settings saved successfully!');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('Failed to save notification settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const testNotification = async () => {
    try {
      const response = await fetch('/api/notifications/process', {
        method: 'POST',
      });

      if (response.ok) {
        alert('Test notification processing completed! Check your email/SMS for any pending notifications.');
      } else {
        throw new Error('Failed to process notifications');
      }
    } catch (error) {
      console.error('Error testing notifications:', error);
      alert('Failed to test notifications. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Notification Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure email and SMS notifications for appointments and leads.
        </p>
      </div>

      {/* Email Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Email Notifications
        </h4>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="emailEnabled"
              checked={settings.emailEnabled}
              onChange={(e) => setSettings(prev => ({ ...prev, emailEnabled: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="emailEnabled" className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
              Enable email notifications
            </label>
          </div>

          {settings.emailEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Provider
                </label>
                <select
                  value={settings.emailProvider}
                  onChange={(e) => setSettings(prev => ({ ...prev, emailProvider: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="resend">Resend</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="nodemailer">Nodemailer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  From Email Address
                </label>
                <input
                  type="email"
                  value={settings.fromEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="noreply@yourdomain.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  From Name
                </label>
                <input
                  type="text"
                  value={settings.fromName}
                  onChange={(e) => setSettings(prev => ({ ...prev, fromName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Your Company Name"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* SMS Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          SMS Notifications
        </h4>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="smsEnabled"
              checked={settings.smsEnabled}
              onChange={(e) => setSettings(prev => ({ ...prev, smsEnabled: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="smsEnabled" className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
              Enable SMS notifications
            </label>
          </div>

          {settings.smsEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SMS Provider
              </label>
              <select
                value={settings.smsProvider}
                onChange={(e) => setSettings(prev => ({ ...prev, smsProvider: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="twilio">Twilio</option>
                <option value="vonage">Vonage</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Environment Variables Info */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          Required Environment Variables
        </h5>
        <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
          <p><code>EMAIL_API_KEY</code> - API key for your email provider</p>
          <p><code>SMS_API_KEY</code> - API key for your SMS provider</p>
          <p><code>SMS_API_SECRET</code> - API secret for your SMS provider (if required)</p>
          <p><code>SMS_FROM_NUMBER</code> - Phone number to send SMS from</p>
          <p><code>CRON_API_KEY</code> - API key for cron job authentication (optional)</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={testNotification}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-700"
        >
          Test Notifications
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;