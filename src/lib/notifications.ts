import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { supabase } from './supabase';

// Initialize email providers lazily to avoid build errors
let resend: Resend | null = null;
const getResend = () => {
  if (!resend) {
    // Support both RESEND_API_KEY and EMAIL_API_KEY for backward compatibility
    const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
    if (apiKey && apiKey.startsWith('re_')) {
      try {
        resend = new Resend(apiKey);
      } catch (error) {
        console.warn('Failed to initialize Resend:', error);
        return null;
      }
    }
  }
  return resend;
};

// Gmail transporter
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Generic SMTP transporter
const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface NotificationData {
  type: string;
  recipientEmail: string;
  subject: string;
  content: string;
  leadId?: string;
  appointmentId?: string;
  metadata?: Record<string, any>;
}

export interface EmailTemplateData {
  leadName: string;
  leadEmail: string;
  leadCompany?: string;
  leadPhone?: string;
  propertyInterest?: string;
  source: string;
  priority: string;
  adminName?: string;
  companyName?: string;
  appUrl?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    provider: 'resend' | 'gmail' | 'smtp';
    fromEmail: string;
    fromName: string;
    apiKey?: string;
  };
  sms?: {
    enabled: boolean;
    provider: 'twilio';
    fromNumber: string;
    apiKey?: string;
    apiSecret?: string;
  };
}

export interface NotificationData {
  type: 'appointment_reminder' | 'lead_notification' | 'property_alert';
  recipient: {
    name: string;
    email?: string;
    phone?: string;
  };
  data: {
    appointmentTitle?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    appointmentLocation?: string;
    leadName?: string;
    propertyAddress?: string;
    [key: string]: any;
  };
  scheduledFor?: Date;
  reminderType?: '24h' | '2h' | 'immediate';
}

// Email templates
export const emailTemplates = {
  newLeadAdmin: (data: EmailTemplateData) => ({
    subject: `🚨 New Lead Alert: ${data.leadName}${data.leadCompany ? ` from ${data.leadCompany}` : ''}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Lead Alert</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6, #1E40AF); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .lead-info { background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .urgent { background: #FEE2E2; color: #DC2626; }
            .high { background: #FEF3C7; color: #D97706; }
            .medium { background: #FEF9C3; color: #CA8A04; }
            .low { background: #DCFCE7; color: #16A34A; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .button:hover { background: #2563EB; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🏢 New Lead Alert</h1>
            </div>

            <div class="content">
              <div class="lead-info">
                <h2 style="margin-top: 0; color: #1F2937;">Lead Information</h2>

                <p><strong>👤 Name:</strong> ${data.leadName}</p>
                <p><strong>📧 Email:</strong> <a href="mailto:${data.leadEmail}">${data.leadEmail}</a></p>
                ${data.leadPhone ? `<p><strong>📱 Phone:</strong> <a href="tel:${data.leadPhone}">${data.leadPhone}</a></p>` : ''}
                ${data.leadCompany ? `<p><strong>🏢 Company:</strong> ${data.leadCompany}</p>` : ''}

                <p><strong>🎯 Priority:</strong>
                  <span class="priority-badge ${data.priority}">
                    ${data.priority}
                  </span>
                </p>

                <p><strong>📍 Source:</strong> ${data.source.charAt(0).toUpperCase() + data.source.slice(1).replace('-', ' ')}</p>

                ${data.propertyInterest ? `<p><strong>🏠 Property Interest:</strong> ${data.propertyInterest}</p>` : ''}
              </div>

              <div style="text-align: center;">
                <a href="${data.appUrl || 'http://localhost:3002'}/leads" class="button">
                  View Lead in CRM →
                </a>
              </div>
            </div>

            <div class="footer">
              <p style="font-size: 12px; color: #9CA3AF;">Generated at ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `New Lead Alert: ${data.leadName}

Name: ${data.leadName}
Email: ${data.leadEmail}
${data.leadPhone ? `Phone: ${data.leadPhone}\n` : ''}${data.leadCompany ? `Company: ${data.leadCompany}\n` : ''}Priority: ${data.priority.toUpperCase()}
Source: ${data.source.replace('-', ' ')}
${data.propertyInterest ? `Property Interest: ${data.propertyInterest}\n` : ''}
View in CRM: ${data.appUrl || 'http://localhost:3002'}/leads

Generated at ${new Date().toLocaleString()}`
  }),

  newLeadConfirmation: (data: EmailTemplateData) => ({
    subject: `Thank you for your inquiry - Shallow Bay Advisors`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Thank You for Your Inquiry</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .highlight-box { background: #F0FDF4; border: 2px solid #10B981; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🏢 Shallow Bay Advisors</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Commercial Real Estate Excellence</p>
            </div>

            <div class="content">
              <h2 style="color: #1F2937;">Hello ${data.leadName}!</h2>

              <p>Thank you for your inquiry about commercial real estate. We've scheduled an appointment to discuss your requirements and show you the property that matches your needs.</p>

              <div class="highlight-box">
                <h3 style="margin-top: 0; color: #059669;">📅 Your Appointment Confirmation</h3>
                <p><strong>Meeting scheduled to discuss:</strong> ${data.propertyInterest || 'Commercial real estate opportunities'}</p>
                <p>Our team will provide detailed information about available properties and help you find the perfect space for your business needs.</p>
              </div>

              ${data.propertyInterest ? `
                <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>🏠 Property of Interest:</strong></p>
                  <p style="margin: 5px 0 0 0; font-size: 16px;">
                    <a href="https://shabay.netlify.app/properties" style="color: #059669; text-decoration: none; font-weight: bold;">
                      📍 ${data.propertyInterest}
                    </a>
                  </p>
                </div>
              ` : ''}

              <p><strong>Need to make changes?</strong></p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="https://sbaycrm.netlify.app/api/appointments/cancel?email=${encodeURIComponent(data.leadEmail)}"
                   style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  Cancel Appointment
                </a>
              </div>

              <p>Questions? Contact us:</p>
              <ul>
                <li>📱 Call us directly at <strong>(954) 937-9667</strong></li>
                <li>📧 Reply to this email with any questions</li>
                <li>🌐 Visit our website for more properties</li>
              </ul>

              <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px; color: #4B5563; text-align: center;">
                  <strong>Shallow Bay Advisors</strong><br>
                  Your trusted partner in commercial real estate<br>
                  Excellence • Expertise • Results
                </p>
              </div>
            </div>

            <div class="footer">
              <p>This is an automated confirmation. Please do not reply to this email.</p>
              <p style="font-size: 12px; color: #9CA3AF;">© ${new Date().getFullYear()} Shallow Bay Advisors. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Thank you for your inquiry - Shallow Bay Advisors

Hello ${data.leadName}!

Thank you for reaching out to Shallow Bay Advisors. We've received your inquiry and are excited to help you with your commercial real estate needs.

What happens next?
• Within 24 hours: One of our experienced advisors will contact you
• We'll discuss: Your specific requirements and objectives
• Custom solutions: Tailored recommendations based on your needs
• Next steps: A clear action plan to move forward

${data.propertyInterest ? `We noted your interest in: ${data.propertyInterest}\nOur team is already preparing relevant market insights and property options that match your criteria.\n\n` : ''}In the meantime, feel free to:
• Call us directly at (XXX) XXX-XXXX
• Reply to this email with any additional questions
• Visit our website for more information

Shallow Bay Advisors
Your trusted partner in commercial real estate
Excellence • Expertise • Results

This is an automated confirmation. Please do not reply to this email.
© ${new Date().getFullYear()} Shallow Bay Advisors. All rights reserved.`
  })
};

export class NotificationService {
  /**
   * Create a notification record in the database
   */
  static async createNotification(data: NotificationData): Promise<string> {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        type: data.type,
        recipient_email: data.recipientEmail,
        subject: data.subject,
        content: data.content,
        lead_id: data.leadId,
        appointment_id: data.appointmentId,
        metadata: data.metadata || {}
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }

    return notification.id;
  }

  /**
   * Send email notification using configured provider
   */
  static async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
    notificationId?: string
  ): Promise<boolean> {
    const provider = process.env.EMAIL_PROVIDER || 'resend';
    // Temporarily hardcode working email for testing
    const fromEmail = 'onboarding@resend.dev';

    try {
      let result: any;

      switch (provider) {
        case 'gmail':
          result = await gmailTransporter.sendMail({
            from: `"Shallow Bay Advisors" <${fromEmail}>`,
            to,
            subject,
            text,
            html,
          });
          break;

        case 'smtp':
          result = await smtpTransporter.sendMail({
            from: `"Shallow Bay Advisors" <${fromEmail}>`,
            to,
            subject,
            text,
            html,
          });
          break;

        case 'resend':
        default:
          const resendInstance = getResend();
          if (!resendInstance) {
            throw new Error('Resend not configured or failed to initialize');
          }
          result = await resendInstance.emails.send({
            from: `Shallow Bay Advisors <${fromEmail}>`,
            to: [to],
            subject,
            html,
            text
          });
          console.log('Resend full response:', JSON.stringify(result, null, 2));
          break;
      }

      // Update notification status to sent
      if (notificationId) {
        await supabase
          .from('notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            metadata: {
              provider,
              message_id: result.data?.id || result.messageId,
              response: result.response
            }
          })
          .eq('id', notificationId);
      }

      console.log(`Email sent successfully via ${provider}:`, result.data?.id || result.messageId);
      return true;

    } catch (error: any) {
      console.error(`Error sending email via ${provider}:`, error);

      // Update notification status to failed
      if (notificationId) {
        await supabase
          .from('notifications')
          .update({
            status: 'failed',
            error_message: error.message,
            retry_count: 1,
            metadata: { provider, error: error.message }
          })
          .eq('id', notificationId);
      }

      return false;
    }
  }

  /**
   * Send new lead notification to admin
   */
  static async sendNewLeadNotificationToAdmin(leadData: any, adminEmail: string): Promise<boolean> {
    try {
      const templateData: EmailTemplateData = {
        leadName: leadData.name,
        leadEmail: leadData.email,
        leadCompany: leadData.company,
        leadPhone: leadData.phone,
        propertyInterest: leadData.property_interest,
        source: leadData.source,
        priority: leadData.priority,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
      };

      const template = emailTemplates.newLeadAdmin(templateData);

      // Send email directly (skip database logging for now)
      return await this.sendEmail(
        adminEmail,
        template.subject,
        template.html,
        template.text
      );

    } catch (error) {
      console.error('Error sending new lead notification to admin:', error);
      return false;
    }
  }

  /**
   * Send confirmation email to the lead
   */
  static async sendLeadConfirmation(leadData: any): Promise<boolean> {
    try {
      const templateData: EmailTemplateData = {
        leadName: leadData.name,
        leadEmail: leadData.email,
        leadCompany: leadData.company,
        leadPhone: leadData.phone,
        propertyInterest: leadData.property_interest,
        source: leadData.source,
        priority: leadData.priority
      };

      const template = emailTemplates.newLeadConfirmation(templateData);

      // Send email directly (skip database logging for now)
      return await this.sendEmail(
        leadData.email,
        template.subject,
        template.html,
        template.text
      );

    } catch (error) {
      console.error('Error sending lead confirmation:', error);
      return false;
    }
  }

  /**
   * Send both admin notification and lead confirmation
   */
  static async sendNewLeadNotifications(leadData: any, adminEmail: string): Promise<{
    adminSent: boolean;
    leadSent: boolean;
  }> {
    const [adminSent, leadSent] = await Promise.all([
      this.sendNewLeadNotificationToAdmin(leadData, adminEmail),
      this.sendLeadConfirmation(leadData)
    ]);

    return { adminSent, leadSent };
  }

  /**
   * Get notification history for a lead
   */
  static async getNotificationsForLead(leadId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications for lead:', error);
      throw error;
    }

    return data;
  }

  /**
   * Retry failed notifications
   */
  static async retryFailedNotifications(maxRetries: number = 3): Promise<number> {
    const { data: failedNotifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', maxRetries);

    if (error || !failedNotifications?.length) {
      return 0;
    }

    let successCount = 0;

    for (const notification of failedNotifications) {
      try {
        const success = await this.sendEmail(
          notification.recipient_email,
          notification.subject,
          notification.content, // Using content as HTML for retries
          notification.content,
          notification.id
        );

        if (success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to retry notification ${notification.id}:`, error);
      }
    }

    return successCount;
  }

  /**
   * Instance method to send notification (required by notification scheduler)
   */
  async sendNotification(data: {
    type: string;
    data: {
      name: string;
      email?: string;
      [key: string]: any;
    };
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { type, data: notificationData } = data;

      // Handle different notification types
      switch (type) {
        case 'appointment_reminder_24h':
        case 'appointment_reminder_2h':
          return await this.sendAppointmentReminder(notificationData);

        case 'new_lead_notification':
          if (!notificationData.email) {
            return { success: false, error: 'No email provided for lead notification' };
          }
          const success = await NotificationService.sendNewLeadNotificationToAdmin(
            notificationData,
            notificationData.email
          );
          return { success };

        default:
          return { success: false, error: `Unknown notification type: ${type}` };
      }
    } catch (error) {
      console.error('Error in sendNotification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send appointment reminder
   */
  private async sendAppointmentReminder(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!data.email) {
        return { success: false, error: 'No email provided for appointment reminder' };
      }

      const subject = data.reminderType === '24h'
        ? `Reminder: ${data.appointmentTitle} tomorrow`
        : `Reminder: ${data.appointmentTitle} in 2 hours`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Appointment Reminder</h2>
          <p>Hello ${data.name},</p>
          <p>This is a reminder about your upcoming appointment:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${data.appointmentTitle}</h3>
            <p><strong>Date:</strong> ${data.appointmentDate}</p>
            <p><strong>Time:</strong> ${data.appointmentTime}</p>
            ${data.appointmentLocation ? `<p><strong>Location:</strong> ${data.appointmentLocation}</p>` : ''}
          </div>
          <p>We look forward to seeing you!</p>
          <p>Best regards,<br>Shallow Bay Advisors</p>
        </div>
      `;

      const text = `Appointment Reminder

Hello ${data.name},

This is a reminder about your upcoming appointment:

${data.appointmentTitle}
Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
${data.appointmentLocation ? `Location: ${data.appointmentLocation}\n` : ''}

We look forward to seeing you!

Best regards,
Shallow Bay Advisors`;

      const success = await NotificationService.sendEmail(
        data.email,
        subject,
        html,
        text
      );

      return { success };
    } catch (error) {
      console.error('Error sending appointment reminder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}