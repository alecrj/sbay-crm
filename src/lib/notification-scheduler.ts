import { supabaseAdmin } from './supabase';
import { NotificationService, NotificationData, NotificationConfig } from './notifications';

// Notification queue item
export interface NotificationQueueItem {
  id: string;
  type: 'appointment_reminder' | 'lead_notification' | 'property_alert';
  recipient_email?: string;
  recipient_phone?: string;
  recipient_name: string;
  scheduled_for: string;
  data: Record<string, any>;
  status: 'pending' | 'sent' | 'failed';
  reminder_type?: '24h' | '2h' | 'immediate';
  appointment_id?: string;
  lead_id?: string;
  attempts: number;
  last_attempt?: string;
  error_message?: string;
  created_at: string;
}

// Schedule appointment reminders when an appointment is created
export const scheduleAppointmentReminders = async (
  appointmentId: string,
  appointmentData: {
    title: string;
    start_time: string;
    end_time: string;
    location?: string;
    attendees?: string[];
    lead_id?: string;
  }
): Promise<void> => {
  try {
    const startTime = new Date(appointmentData.start_time);
    const now = new Date();

    // Calculate reminder times
    const reminder24h = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
    const reminder2h = new Date(startTime.getTime() - 2 * 60 * 60 * 1000);

    // Get recipient information
    let recipientName = 'Client';
    let recipientEmail: string | undefined;
    let recipientPhone: string | undefined;

    if (appointmentData.lead_id) {
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select('name, email, phone')
        .eq('id', appointmentData.lead_id)
        .single();

      if (lead) {
        recipientName = lead.name;
        recipientEmail = lead.email;
        recipientPhone = lead.phone;
      }
    } else if (appointmentData.attendees && appointmentData.attendees.length > 0) {
      recipientEmail = appointmentData.attendees[0];
    }

    const baseNotificationData = {
      appointmentTitle: appointmentData.title,
      appointmentDate: startTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      appointmentTime: startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      appointmentLocation: appointmentData.location,
      name: recipientName,
    };

    const notificationsToSchedule: Partial<NotificationQueueItem>[] = [];

    // Schedule 24-hour reminder (only if it's in the future)
    if (reminder24h > now) {
      notificationsToSchedule.push({
        type: 'appointment_reminder_24h',
        recipient_email: recipientEmail,
        recipient_phone: recipientPhone,
        recipient_name: recipientName,
        scheduled_for: reminder24h.toISOString(),
        data: baseNotificationData,
        status: 'pending',
        reminder_type: '24h',
        appointment_id: appointmentId,
        attempts: 0,
      });
    }

    // Schedule 2-hour reminder (only if it's in the future)
    if (reminder2h > now) {
      notificationsToSchedule.push({
        type: 'appointment_reminder_2h',
        recipient_email: recipientEmail,
        recipient_phone: recipientPhone,
        recipient_name: recipientName,
        scheduled_for: reminder2h.toISOString(),
        data: baseNotificationData,
        status: 'pending',
        reminder_type: '2h',
        appointment_id: appointmentId,
        attempts: 0,
      });

      // Schedule 2-hour business reminder
      const businessEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      if (businessEmail) {
        notificationsToSchedule.push({
          type: 'business_reminder_2h',
          recipient_email: businessEmail,
          recipient_phone: undefined,
          recipient_name: 'Shallow Bay Team',
          scheduled_for: reminder2h.toISOString(),
          data: {
            ...baseNotificationData,
            clientName: recipientName,
            clientEmail: recipientEmail,
          },
          status: 'pending',
          reminder_type: '2h',
          appointment_id: appointmentId,
          attempts: 0,
        });
      }
    }

    // Insert notifications into the queue
    if (notificationsToSchedule.length > 0) {
      const { error } = await supabaseAdmin
        .from('notification_queue')
        .insert(notificationsToSchedule);

      if (error) {
        console.error('Error scheduling appointment reminders:', error);
      } else {
        console.log(`Scheduled ${notificationsToSchedule.length} reminders for appointment ${appointmentId}`);
      }
    }
  } catch (error) {
    console.error('Error in scheduleAppointmentReminders:', error);
  }
};

// Cancel scheduled reminders for an appointment
export const cancelAppointmentReminders = async (appointmentId: string): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('notification_queue')
      .delete()
      .eq('appointment_id', appointmentId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error canceling appointment reminders:', error);
    } else {
      console.log(`Canceled reminders for appointment ${appointmentId}`);
    }
  } catch (error) {
    console.error('Error in cancelAppointmentReminders:', error);
  }
};

// Update reminders when appointment is rescheduled
export const updateAppointmentReminders = async (
  appointmentId: string,
  appointmentData: {
    title: string;
    start_time: string;
    end_time: string;
    location?: string;
    attendees?: string[];
    lead_id?: string;
  }
): Promise<void> => {
  // Cancel existing reminders
  await cancelAppointmentReminders(appointmentId);

  // Schedule new reminders
  await scheduleAppointmentReminders(appointmentId, appointmentData);
};

// Schedule immediate notification for new leads
export const scheduleLeadNotification = async (
  leadId: string,
  leadData: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    source: string;
    priority: string;
  }
): Promise<void> => {
  try {
    // Get admin users to notify (you can customize this logic)
    const { data: adminUsers } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('role', 'admin');

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admin users found for lead notification');
      return;
    }

    const crmUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const notificationsToSchedule = adminUsers.map(admin => ({
      type: 'new_lead_notification' as const,
      recipient_email: admin.email,
      recipient_name: admin.name || 'Admin',
      scheduled_for: new Date().toISOString(),
      data: {
        leadName: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        company: leadData.company,
        source: leadData.source,
        priority: leadData.priority,
        crmUrl,
      },
      status: 'pending' as const,
      reminder_type: 'immediate' as const,
      lead_id: leadId,
      attempts: 0,
    }));

    const { error } = await supabaseAdmin
      .from('notification_queue')
      .insert(notificationsToSchedule);

    if (error) {
      console.error('Error scheduling lead notification:', error);
    } else {
      console.log(`Scheduled lead notification for ${adminUsers.length} admin(s)`);
    }
  } catch (error) {
    console.error('Error in scheduleLeadNotification:', error);
  }
};

// Process pending notifications (this would be called by a cron job or background worker)
export const processPendingNotifications = async (config?: NotificationConfig): Promise<void> => {
  try {
    const now = new Date().toISOString();

    // Get all pending notifications that are due
    const { data: pendingNotifications, error } = await supabaseAdmin
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .lt('attempts', 3) // Max 3 attempts
      .order('scheduled_for', { ascending: true })
      .limit(50); // Process in batches

    if (error) {
      console.error('Error fetching pending notifications:', error);
      return;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('No pending notifications to process');
      return;
    }

    console.log(`Processing ${pendingNotifications.length} pending notifications`);

    for (const notification of pendingNotifications) {
      try {
        // Update attempt count and last attempt time
        await supabaseAdmin
          .from('notification_queue')
          .update({
            attempts: notification.attempts + 1,
            last_attempt: new Date().toISOString(),
          })
          .eq('id', notification.id);

        // Send the notification
        const notificationService = new NotificationService();

        const result = await notificationService.sendNotification({
          type: notification.type as any,
          data: {
            ...notification.data,
            name: notification.recipient_name,
            email: notification.recipient_email,
          }
        });

        // Update status based on result
        if (result.success) {
          await supabaseAdmin
            .from('notification_queue')
            .update({
              status: 'sent',
              error_message: null,
            })
            .eq('id', notification.id);

          // Update legacy boolean fields in appointments table for UI compatibility
          if (notification.appointment_id &&
              (notification.reminder_type === '24h' || notification.reminder_type === '2h')) {
            const fieldToUpdate = notification.reminder_type === '24h'
              ? 'reminder_24h_sent'
              : 'reminder_2h_sent';

            await supabaseAdmin
              .from('appointments')
              .update({ [fieldToUpdate]: true })
              .eq('id', notification.appointment_id);
          }

          console.log(`Successfully sent notification ${notification.id}`);
        } else {
          const errorMessage = result.error || 'Failed to send notification';
          await supabaseAdmin
            .from('notification_queue')
            .update({
              status: notification.attempts >= 2 ? 'failed' : 'pending',
              error_message: errorMessage,
            })
            .eq('id', notification.id);

          console.log(`Failed to send notification ${notification.id}: ${errorMessage}`);
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);

        await supabaseAdmin
          .from('notification_queue')
          .update({
            status: notification.attempts >= 2 ? 'failed' : 'pending',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', notification.id);
      }
    }
  } catch (error) {
    console.error('Error in processPendingNotifications:', error);
  }
};

// Get notification statistics
export const getNotificationStats = async (): Promise<{
  pending: number;
  sent: number;
  failed: number;
  total: number;
}> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notification_queue')
      .select('status')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (error) throw error;

    const stats = {
      pending: 0,
      sent: 0,
      failed: 0,
      total: data?.length || 0,
    };

    data?.forEach(item => {
      stats[item.status as keyof typeof stats]++;
    });

    return stats;
  } catch (error) {
    console.error('Error getting notification stats:', error);
    return { pending: 0, sent: 0, failed: 0, total: 0 };
  }
};