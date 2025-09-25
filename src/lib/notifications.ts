import nodemailer from 'nodemailer';
import { supabase } from './supabase';

// Dynamic import of Resend to avoid build-time issues
let Resend: any = null;
let resend: any = null;

const getResend = async () => {
  // Only initialize when actually needed (not during build)
  if (!resend && process.env.RESEND_API_KEY) {
    try {
      // Dynamically import Resend only when needed
      if (!Resend) {
        const { Resend: ResendClass } = await import('resend');
        Resend = ResendClass;
      }

      // Double-check we have a valid API key format
      if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.length > 0) {
        resend = new Resend(process.env.RESEND_API_KEY);
      } else {
        console.warn('Resend API key is not configured');
        return null;
      }
    } catch (error) {
      console.warn('Failed to initialize Resend:', error);
      return null;
    }
  }
  return resend;
};

// Gmail transporter (lazy initialization)
let gmailTransporter: nodemailer.Transporter | null = null;
const getGmailTransporter = () => {
  if (!gmailTransporter && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return gmailTransporter;
};

// Generic SMTP transporter (lazy initialization)
let smtpTransporter: nodemailer.Transporter | null = null;
const getSmtpTransporter = () => {
  if (!smtpTransporter && process.env.SMTP_HOST) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return smtpTransporter;
};

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
              <p style="margin: 10px 0 0 0; opacity: 0.9;">A new potential client has submitted their information</p>
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

              <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px; color: #4B5563;">
                  💡 <strong>Quick Action Tips:</strong><br>
                  • Respond within 15 minutes for highest conversion rates<br>
                  • Check their property interest and prepare relevant listings<br>
                  • Review their source to tailor your approach
                </p>
              </div>
            </div>

            <div class="footer">
              <p>This notification was sent by your Shallow Bay CRM system.</p>
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

              <p>Thank you for reaching out to <strong>Shallow Bay Advisors</strong>. We've received your inquiry and are excited to help you with your commercial real estate needs.</p>

              <div class="highlight-box">
                <h3 style="margin-top: 0; color: #059669;">✅ What happens next?</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><strong>Within 24 hours:</strong> One of our experienced advisors will contact you</li>
                  <li><strong>We'll discuss:</strong> Your specific requirements and objectives</li>
                  <li><strong>Custom solutions:</strong> Tailored recommendations based on your needs</li>
                  <li><strong>Next steps:</strong> A clear action plan to move forward</li>
                </ul>
              </div>

              ${data.propertyInterest ? `
                <p><strong>🏠 We noted your interest in:</strong> ${data.propertyInterest}</p>
                <p>Our team is already preparing relevant market insights and property options that match your criteria.</p>
              ` : ''}

              <p>In the meantime, feel free to:</p>
              <ul>
                <li>📱 Call us directly at <strong>(XXX) XXX-XXXX</strong></li>
                <li>📧 Reply to this email with any additional questions</li>
                <li>🌐 Visit our website for more information</li>
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
    const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@yourdomain.com';

    try {
      let result: any;

      switch (provider) {
        case 'gmail':
          const gmailTransporterInstance = getGmailTransporter();
          if (!gmailTransporterInstance) {
            throw new Error('Gmail credentials not configured');
          }
          result = await gmailTransporterInstance.sendMail({
            from: `"Shallow Bay CRM" <${fromEmail}>`,
            to,
            subject,
            text,
            html,
          });
          break;

        case 'smtp':
          const smtpTransporterInstance = getSmtpTransporter();
          if (!smtpTransporterInstance) {
            throw new Error('SMTP configuration not available');
          }
          result = await smtpTransporterInstance.sendMail({
            from: `"Shallow Bay CRM" <${fromEmail}>`,
            to,
            subject,
            text,
            html,
          });
          break;

        case 'resend':
        default:
          if (!process.env.RESEND_API_KEY) {
            throw new Error('Resend API key not configured. Please set RESEND_API_KEY environment variable.');
          }
          const resendInstance = await getResend();
          if (!resendInstance) {
            throw new Error('Failed to initialize Resend. Please check your API key.');
          }
          result = await resendInstance.emails.send({
            from: `Shallow Bay CRM <${fromEmail}>`,
            to: [to],
            subject,
            html,
            text
          });
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

      // Create notification record
      const notificationId = await this.createNotification({
        type: 'new_lead_admin',
        recipientEmail: adminEmail,
        subject: template.subject,
        content: template.text,
        leadId: leadData.id
      });

      // Send email
      return await this.sendEmail(
        adminEmail,
        template.subject,
        template.html,
        template.text,
        notificationId
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

      // Create notification record
      const notificationId = await this.createNotification({
        type: 'new_lead_confirmation',
        recipientEmail: leadData.email,
        subject: template.subject,
        content: template.text,
        leadId: leadData.id
      });

      // Send email
      return await this.sendEmail(
        leadData.email,
        template.subject,
        template.html,
        template.text,
        notificationId
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
   * Send notification based on type and data (used by notification scheduler)
   */
  async sendNotification(params: {
    type: string;
    data: {
      name: string;
      email?: string;
      [key: string]: any;
    };
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { type, data } = params;

      switch (type) {
        case 'appointment_reminder_24h':
        case 'appointment_reminder_2h':
          return await this.sendAppointmentReminder(data, type);

        case 'new_lead_notification':
          if (!data.email) {
            return { success: false, error: 'No email provided for lead notification' };
          }
          const success = await NotificationService.sendNewLeadNotificationToAdmin(data, data.email);
          return { success, error: success ? undefined : 'Failed to send lead notification' };

        case 'property_alert':
          return await this.sendPropertyAlert(data);

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
  private async sendAppointmentReminder(data: any, type: string): Promise<{ success: boolean; error?: string }> {
    try {
      const reminderType = type.includes('24h') ? '24-hour' : '2-hour';
      const subject = `🗓️ Appointment Reminder - ${data.appointmentTitle} (${reminderType} notice)`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Appointment Reminder</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .appointment-info { background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">📅 Appointment Reminder</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${reminderType} notice</p>
              </div>
              <div class="content">
                <h2 style="color: #1F2937;">Hello ${data.name}!</h2>
                <p>This is a friendly reminder about your upcoming appointment:</p>
                <div class="appointment-info">
                  <h3 style="margin-top: 0; color: #7C3AED;">📝 ${data.appointmentTitle}</h3>
                  <p><strong>📅 Date:</strong> ${data.appointmentDate}</p>
                  <p><strong>🕒 Time:</strong> ${data.appointmentTime}</p>
                  ${data.appointmentLocation ? `<p><strong>📍 Location:</strong> ${data.appointmentLocation}</p>` : ''}
                </div>
                <p>We look forward to meeting with you!</p>
              </div>
              <div class="footer">
                <p>Shallow Bay Advisors - Your Commercial Real Estate Partner</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const text = `Appointment Reminder - ${reminderType} notice

Hello ${data.name}!

This is a friendly reminder about your upcoming appointment:

${data.appointmentTitle}
Date: ${data.appointmentDate}
Time: ${data.appointmentTime}
${data.appointmentLocation ? `Location: ${data.appointmentLocation}\n` : ''}
We look forward to meeting with you!

Shallow Bay Advisors - Your Commercial Real Estate Partner`;

      const success = await NotificationService.sendEmail(
        data.email,
        subject,
        html,
        text
      );

      return { success, error: success ? undefined : 'Failed to send appointment reminder' };
    } catch (error) {
      console.error('Error sending appointment reminder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send property alert
   */
  private async sendPropertyAlert(data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `🏢 Property Alert - ${data.propertyTitle || 'New Property Available'}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Property Alert</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .property-info { background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #F59E0B; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🏢 Property Alert</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">New property matching your criteria</p>
              </div>
              <div class="content">
                <h2 style="color: #1F2937;">Hello ${data.name}!</h2>
                <p>We found a property that matches your search criteria:</p>
                <div class="property-info">
                  <h3 style="margin-top: 0; color: #D97706;">${data.propertyTitle || 'Property Available'}</h3>
                  ${data.propertyAddress ? `<p><strong>📍 Address:</strong> ${data.propertyAddress}</p>` : ''}
                  ${data.propertySize ? `<p><strong>📏 Size:</strong> ${data.propertySize}</p>` : ''}
                  ${data.propertyPrice ? `<p><strong>💰 Price:</strong> ${data.propertyPrice}</p>` : ''}
                </div>
                <p>Contact us for more details about this property.</p>
              </div>
              <div class="footer">
                <p>Shallow Bay Advisors - Your Commercial Real Estate Partner</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const text = `Property Alert - New property matching your criteria

Hello ${data.name}!

We found a property that matches your search criteria:

${data.propertyTitle || 'Property Available'}
${data.propertyAddress ? `Address: ${data.propertyAddress}\n` : ''}${data.propertySize ? `Size: ${data.propertySize}\n` : ''}${data.propertyPrice ? `Price: ${data.propertyPrice}\n` : ''}
Contact us for more details about this property.

Shallow Bay Advisors - Your Commercial Real Estate Partner`;

      const success = await NotificationService.sendEmail(
        data.email,
        subject,
        html,
        text
      );

      return { success, error: success ? undefined : 'Failed to send property alert' };
    } catch (error) {
      console.error('Error sending property alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}