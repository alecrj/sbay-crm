// Notification system for email and SMS reminders
export interface NotificationConfig {
  email?: {
    enabled: boolean;
    provider: 'resend' | 'sendgrid' | 'nodemailer';
    apiKey?: string;
    fromEmail: string;
    fromName: string;
  };
  sms?: {
    enabled: boolean;
    provider: 'twilio' | 'vonage';
    apiKey?: string;
    apiSecret?: string;
    fromNumber: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
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
export const emailTemplates: Record<string, EmailTemplate> = {
  appointment_reminder_24h: {
    subject: 'Appointment Reminder - Tomorrow at {{time}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Appointment Reminder</h2>
        <p>Hello {{name}},</p>
        <p>This is a friendly reminder that you have an appointment scheduled for <strong>tomorrow</strong>:</p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">{{appointmentTitle}}</h3>
          <p style="margin: 5px 0;"><strong>Date:</strong> {{appointmentDate}}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> {{appointmentTime}}</p>
          {{#if appointmentLocation}}
          <p style="margin: 5px 0;"><strong>Location:</strong> {{appointmentLocation}}</p>
          {{/if}}
        </div>

        <p>Please let us know if you need to reschedule or have any questions.</p>
        <p>Best regards,<br>Shallow Bay Advisors Team</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated reminder. Please do not reply to this email.
        </p>
      </div>
    `,
    text: `
      Appointment Reminder

      Hello {{name}},

      This is a friendly reminder that you have an appointment scheduled for tomorrow:

      {{appointmentTitle}}
      Date: {{appointmentDate}}
      Time: {{appointmentTime}}
      {{#if appointmentLocation}}Location: {{appointmentLocation}}{{/if}}

      Please let us know if you need to reschedule or have any questions.

      Best regards,
      Shallow Bay Advisors Team
    `
  },
  appointment_reminder_2h: {
    subject: 'Appointment Starting Soon - {{time}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Appointment Starting Soon</h2>
        <p>Hello {{name}},</p>
        <p>Your appointment is starting in <strong>2 hours</strong>:</p>

        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 10px 0; color: #92400e;">{{appointmentTitle}}</h3>
          <p style="margin: 5px 0;"><strong>Time:</strong> {{appointmentTime}}</p>
          {{#if appointmentLocation}}
          <p style="margin: 5px 0;"><strong>Location:</strong> {{appointmentLocation}}</p>
          {{/if}}
        </div>

        <p>We look forward to meeting with you!</p>
        <p>Best regards,<br>Shallow Bay Advisors Team</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated reminder. Please do not reply to this email.
        </p>
      </div>
    `,
    text: `
      Appointment Starting Soon

      Hello {{name}},

      Your appointment is starting in 2 hours:

      {{appointmentTitle}}
      Time: {{appointmentTime}}
      {{#if appointmentLocation}}Location: {{appointmentLocation}}{{/if}}

      We look forward to meeting with you!

      Best regards,
      Shallow Bay Advisors Team
    `
  },
  new_lead_notification: {
    subject: 'New Lead: {{leadName}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">New Lead Received</h2>
        <p>A new lead has been submitted:</p>

        <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af;">{{leadName}}</h3>
          <p style="margin: 5px 0;"><strong>Email:</strong> {{email}}</p>
          {{#if phone}}<p style="margin: 5px 0;"><strong>Phone:</strong> {{phone}}</p>{{/if}}
          {{#if company}}<p style="margin: 5px 0;"><strong>Company:</strong> {{company}}</p>{{/if}}
          <p style="margin: 5px 0;"><strong>Source:</strong> {{source}}</p>
          <p style="margin: 5px 0;"><strong>Priority:</strong> {{priority}}</p>
        </div>

        <p>Please follow up with this lead as soon as possible.</p>

        <a href="{{crmUrl}}/leads" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          View in CRM
        </a>
      </div>
    `,
    text: `
      New Lead Received

      A new lead has been submitted:

      Name: {{leadName}}
      Email: {{email}}
      {{#if phone}}Phone: {{phone}}{{/if}}
      {{#if company}}Company: {{company}}{{/if}}
      Source: {{source}}
      Priority: {{priority}}

      Please follow up with this lead as soon as possible.

      View in CRM: {{crmUrl}}/leads
    `
  }
};

// SMS templates
export const smsTemplates: Record<string, string> = {
  appointment_reminder_24h: `Hi {{name}}, reminder: You have an appointment tomorrow at {{appointmentTime}} - {{appointmentTitle}}. {{#if appointmentLocation}}Location: {{appointmentLocation}}{{/if}} Questions? Reply STOP to opt out.`,
  appointment_reminder_2h: `Hi {{name}}, your appointment "{{appointmentTitle}}" starts in 2 hours at {{appointmentTime}}. {{#if appointmentLocation}}Location: {{appointmentLocation}}{{/if}} See you soon!`,
};

// Template rendering function
export const renderTemplate = (template: string, data: Record<string, any>): string => {
  let rendered = template;

  // Simple handlebars-like templating
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== undefined && value !== null) {
      // Replace {{key}} with value
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));

      // Handle conditional blocks {{#if key}}...{{/if}}
      const ifRegex = new RegExp(`{{#if ${key}}}(.*?){{/if}}`, 'gs');
      rendered = rendered.replace(ifRegex, value ? '$1' : '');
    }
  });

  // Remove any remaining conditional blocks for falsy values
  rendered = rendered.replace(/{{#if \w+}}.*?{{\/if}}/gs, '');

  // Remove any remaining unused placeholders
  rendered = rendered.replace(/{{.*?}}/g, '');

  return rendered;
};

// Email sending function (using Resend as default)
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text: string,
  config: NotificationConfig['email']
): Promise<boolean> => {
  if (!config?.enabled || !config.apiKey) {
    console.log('Email notifications disabled or not configured');
    return false;
  }

  try {
    switch (config.provider) {
      case 'resend':
        return await sendWithResend(to, subject, html, text, config);
      case 'sendgrid':
        return await sendWithSendgrid(to, subject, html, text, config);
      case 'nodemailer':
        return await sendWithNodemailer(to, subject, html, text, config);
      default:
        console.error('Unknown email provider:', config.provider);
        return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Resend implementation
const sendWithResend = async (
  to: string,
  subject: string,
  html: string,
  text: string,
  config: NotificationConfig['email']
): Promise<boolean> => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config!.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${config!.fromName} <${config!.fromEmail}>`,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  return response.ok;
};

// SendGrid implementation
const sendWithSendgrid = async (
  to: string,
  subject: string,
  html: string,
  text: string,
  config: NotificationConfig['email']
): Promise<boolean> => {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config!.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: config!.fromEmail, name: config!.fromName },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });

  return response.ok;
};

// Nodemailer implementation (requires server-side setup)
const sendWithNodemailer = async (
  to: string,
  subject: string,
  html: string,
  text: string,
  config: NotificationConfig['email']
): Promise<boolean> => {
  // This would require setting up nodemailer on the server
  // For now, return false as it needs more configuration
  console.log('Nodemailer not implemented yet');
  return false;
};

// SMS sending function
export const sendSMS = async (
  to: string,
  message: string,
  config: NotificationConfig['sms']
): Promise<boolean> => {
  if (!config?.enabled || !config.apiKey) {
    console.log('SMS notifications disabled or not configured');
    return false;
  }

  try {
    switch (config.provider) {
      case 'twilio':
        return await sendWithTwilio(to, message, config);
      case 'vonage':
        return await sendWithVonage(to, message, config);
      default:
        console.error('Unknown SMS provider:', config.provider);
        return false;
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};

// Twilio implementation
const sendWithTwilio = async (
  to: string,
  message: string,
  config: NotificationConfig['sms']
): Promise<boolean> => {
  const accountSid = config!.apiKey;
  const authToken = config!.apiSecret;
  const fromNumber = config!.fromNumber;

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: fromNumber,
      To: to,
      Body: message,
    }),
  });

  return response.ok;
};

// Vonage implementation
const sendWithVonage = async (
  to: string,
  message: string,
  config: NotificationConfig['sms']
): Promise<boolean> => {
  const response = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config!.fromNumber,
      to: to.replace('+', ''),
      text: message,
      api_key: config!.apiKey,
      api_secret: config!.apiSecret,
    }),
  });

  return response.ok;
};

// Main notification function
export const sendNotification = async (
  notificationData: NotificationData,
  config: NotificationConfig
): Promise<{ emailSent: boolean; smsSent: boolean }> => {
  const { type, recipient, data } = notificationData;

  let emailSent = false;
  let smsSent = false;

  // Send email notification
  if (recipient.email && config.email?.enabled) {
    const emailTemplate = emailTemplates[type];
    if (emailTemplate) {
      const subject = renderTemplate(emailTemplate.subject, data);
      const html = renderTemplate(emailTemplate.html, data);
      const text = renderTemplate(emailTemplate.text, data);

      emailSent = await sendEmail(recipient.email, subject, html, text, config.email);
    }
  }

  // Send SMS notification
  if (recipient.phone && config.sms?.enabled) {
    const smsTemplate = smsTemplates[type];
    if (smsTemplate) {
      const message = renderTemplate(smsTemplate, data);
      smsSent = await sendSMS(recipient.phone, message, config.sms);
    }
  }

  return { emailSent, smsSent };
};