"use client";

import React, { useEffect, useState } from 'react';

interface BrowserNotificationsProps {
  children?: React.ReactNode;
}

interface NotificationData {
  title: string;
  message: string;
  type: 'lead' | 'appointment' | 'system';
  data?: any;
}

const BrowserNotifications: React.FC<BrowserNotificationsProps> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    if ('Notification' in window) {
      setPermission(Notification.permission);
      setIsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setIsEnabled(result === 'granted');
    }
  };

  const showNotification = (data: NotificationData) => {
    if (!isEnabled || permission !== 'granted') {
      return;
    }

    const notification = new Notification(data.title, {
      body: data.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `${data.type}-${Date.now()}`,
      requireInteraction: data.type === 'lead', // Keep lead notifications until clicked
      actions: data.type === 'lead' ? [
        { action: 'view', title: 'View Lead' },
        { action: 'dismiss', title: 'Dismiss' }
      ] : undefined
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();

      // Navigate based on notification type
      if (data.type === 'lead') {
        window.location.href = '/leads';
      } else if (data.type === 'appointment') {
        window.location.href = '/calendar';
      }
    };

    // Auto-close after 10 seconds for non-critical notifications
    if (data.type !== 'lead') {
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
  };

  // Expose notification function globally for use in other components
  useEffect(() => {
    (window as any).showBrowserNotification = showNotification;

    return () => {
      delete (window as any).showBrowserNotification;
    };
  }, [isEnabled, permission]);

  // Listen for new leads from the API
  useEffect(() => {
    if (!isEnabled) return;

    // Simple polling mechanism to check for new notifications
    // In a production app, you'd want to use WebSockets or Server-Sent Events
    const checkForNewLeads = async () => {
      try {
        const response = await fetch('/api/notifications?action=recent');
        if (response.ok) {
          const data = await response.json();
          // Handle new notifications here if needed
        }
      } catch (error) {
        console.error('Error checking for notifications:', error);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkForNewLeads, 30000);

    return () => clearInterval(interval);
  }, [isEnabled]);

  if (!('Notification' in window)) {
    return null; // Browser doesn't support notifications
  }

  return (
    <>
      {/* Notification permission banner */}
      {permission === 'default' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-2 text-sm">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-2">
              <span>🔔</span>
              <span>
                Enable notifications to get instant alerts for new leads and appointments
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={requestPermission}
                className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-xs font-medium transition-colors"
              >
                Enable
              </button>
              <button
                onClick={() => setPermission('denied')}
                className="text-blue-200 hover:text-white text-xs underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status indicator */}
      {isEnabled && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-green-100 border border-green-200 rounded-lg px-3 py-2 shadow-sm">
            <div className="flex items-center space-x-2 text-green-800 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Notifications enabled</span>
            </div>
          </div>
        </div>
      )}

      {children}
    </>
  );
};

// Utility function to show notifications from anywhere in the app
export const showBrowserNotification = (data: NotificationData) => {
  if (typeof window !== 'undefined' && (window as any).showBrowserNotification) {
    (window as any).showBrowserNotification(data);
  }
};

// Pre-built notification types
export const notificationTemplates = {
  newLead: (leadName: string, company?: string): NotificationData => ({
    title: '🚨 New Lead Alert',
    message: `${leadName}${company ? ` from ${company}` : ''} just submitted an inquiry`,
    type: 'lead',
    data: { leadName, company }
  }),

  appointmentReminder: (title: string, time: string): NotificationData => ({
    title: '⏰ Appointment Reminder',
    message: `${title} starts at ${time}`,
    type: 'appointment',
    data: { title, time }
  }),

  systemAlert: (message: string): NotificationData => ({
    title: '🔔 System Alert',
    message,
    type: 'system'
  })
};

export default BrowserNotifications;