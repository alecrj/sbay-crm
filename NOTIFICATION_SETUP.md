# Notification System Setup Guide

The CRM includes a comprehensive notification system for automated appointment reminders and lead alerts.

## Features

✅ **Automated Appointment Reminders**
- 24-hour email/SMS reminder before appointments
- 2-hour email/SMS reminder before appointments
- Automatic cancellation when appointments are deleted/rescheduled

✅ **Lead Notifications**
- Instant email notifications to admins when new leads are created
- Configurable notification recipients

✅ **Multi-Provider Support**
- **Email**: Resend, SendGrid, Nodemailer
- **SMS**: Twilio, Vonage

✅ **Retry Logic**
- Failed notifications are retried up to 3 times
- Comprehensive error logging

## Setup Instructions

### 1. Email Provider Setup

#### Option A: Resend (Recommended)
1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add to your `.env.local`:
```env
EMAIL_API_KEY=re_your_api_key_here
```

#### Option B: SendGrid
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key with "Mail Send" permissions
3. Add to your `.env.local`:
```env
EMAIL_API_KEY=SG.your_api_key_here
```

### 2. SMS Provider Setup

#### Option A: Twilio
1. Sign up at [twilio.com](https://twilio.com)
2. Get your Account SID, Auth Token, and phone number
3. Add to your `.env.local`:
```env
SMS_API_KEY=your_account_sid
SMS_API_SECRET=your_auth_token
SMS_FROM_NUMBER=+1234567890
```

#### Option B: Vonage (formerly Nexmo)
1. Sign up at [vonage.com](https://vonage.com)
2. Get your API key and secret
3. Add to your `.env.local`:
```env
SMS_API_KEY=your_api_key
SMS_API_SECRET=your_api_secret
SMS_FROM_NUMBER=VONAGE
```

### 3. Configure Environment Variables

Update your `.env.local` file:

```env
# Email Configuration
EMAIL_API_KEY=your_email_api_key

# SMS Configuration (optional)
SMS_API_KEY=your_sms_api_key
SMS_API_SECRET=your_sms_api_secret
SMS_FROM_NUMBER=your_phone_number

# Cron Job Security (optional)
CRON_API_KEY=your_secure_random_key
```

### 4. Configure Notification Settings

1. Go to Settings > Notifications in your CRM
2. Enable email and/or SMS notifications
3. Select your providers
4. Set your "from" email and name
5. Save the settings

### 5. Set Up Automated Processing

For notifications to be sent automatically, you need to set up a cron job or scheduled task that calls the notification processing endpoint.

#### Option A: Vercel Cron Jobs (if deployed on Vercel)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/notifications/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### Option B: External Cron Service

Use a service like [cron-job.org](https://cron-job.org) or [easycron.com](https://easycron.com):

- **URL**: `https://yourdomain.com/api/notifications/process`
- **Method**: POST
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Headers**: `Authorization: Bearer your_cron_api_key` (if using CRON_API_KEY)

#### Option C: Server Cron Job

If you have server access, add to your crontab:

```bash
*/5 * * * * curl -X POST -H "Authorization: Bearer your_cron_api_key" https://yourdomain.com/api/notifications/process
```

## Email Templates

The system includes professional email templates for:

### 24-Hour Reminder
- Subject: "Appointment Reminder - Tomorrow at [time]"
- Includes appointment details, date, time, and location
- Professional branding

### 2-Hour Reminder
- Subject: "Appointment Starting Soon - [time]"
- Urgent styling with yellow accent
- Concise message for immediate attention

### New Lead Notification
- Subject: "New Lead: [name]"
- Complete lead information
- Direct link to CRM

## SMS Templates

Concise SMS messages optimized for mobile:
- 24h: "Hi [name], reminder: You have an appointment tomorrow at [time] - [title]. Questions? Reply STOP to opt out."
- 2h: "Hi [name], your appointment '[title]' starts in 2 hours at [time]. See you soon!"

## Database Schema

The notification system uses the `notification_queue` table:

```sql
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  recipient_name VARCHAR(255) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  reminder_type VARCHAR(20),
  appointment_id UUID REFERENCES appointments(id),
  lead_id UUID REFERENCES leads(id),
  attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Monitoring and Troubleshooting

### Check Notification Status

Visit `/api/notifications/process` (GET) to see statistics:

```json
{
  "stats": {
    "total": 156,
    "pending": 3,
    "sent": 148,
    "failed": 5,
    "overdue": 1
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Issues

1. **Notifications not sending**
   - Check API keys in environment variables
   - Verify provider settings in CRM
   - Ensure cron job is running

2. **Failed notifications**
   - Check error messages in notification_queue table
   - Verify API key permissions
   - Check rate limits

3. **Missing reminders**
   - Ensure cron job runs every 5 minutes
   - Check that appointments have valid email/phone numbers
   - Verify time zone settings

### Testing

Use the "Test Notifications" button in settings to manually trigger notification processing.

## Security Considerations

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Consider using CRON_API_KEY for webhook security
- Regularly rotate API keys
- Monitor notification logs for suspicious activity

## Cost Optimization

### Email Costs
- **Resend**: 3,000 emails/month free, then $20/month
- **SendGrid**: 100 emails/day free, then $19.95/month

### SMS Costs
- **Twilio**: Pay-per-message (~$0.0075/SMS in US)
- **Vonage**: Pay-per-message (~$0.0045/SMS in US)

### Recommendations
1. Start with email notifications only
2. Use SMS sparingly for high-priority reminders
3. Monitor usage through provider dashboards
4. Set up billing alerts

## Next Steps

Once notifications are working:
1. Customize email templates for your brand
2. Add more notification types (property alerts, etc.)
3. Implement user preference management
4. Add notification analytics and reporting