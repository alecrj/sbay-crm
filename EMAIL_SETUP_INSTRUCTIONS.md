# Email Notification Setup Instructions

## Quick Start with Resend (Free Tier)

Resend provides 3,000 emails per month for free, perfect for the CRM notification system.

### 1. Get Free Resend API Key

1. Visit [resend.com](https://resend.com)
2. Click "Sign Up" and create a free account
3. Go to your [API Keys dashboard](https://resend.com/api-keys)
4. Click "Create API Key"
5. Name it "SBA CRM Notifications"
6. Copy the API key (starts with `re_`)

### 2. Update Environment Variables

Edit your `.env.local` file and replace `your_resend_api_key_here` with your actual API key:

```env
EMAIL_API_KEY=re_your_actual_api_key_here
```

### 3. Configure Domain (Optional - for production)

For production use, you'll want to verify your domain:

1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `shallowbayadvisors.com`)
4. Add the DNS records shown to your domain provider
5. Update the "From Email" in CRM settings to use your domain

### 4. Test the System

1. Log into your CRM
2. Go to Settings > Notifications
3. Enable email notifications
4. Set "From Email" to a verified address (use `onboarding@resend.dev` for testing)
5. Set "From Name" to "Shallow Bay Advisors"
6. Click "Test Notifications"

### 5. Set Up Automated Processing

For production, set up a cron job to process notifications:

#### Option A: Netlify (if deployed there)
Add to `netlify.toml`:
```toml
[[plugins]]
  package = "@netlify/plugin-scheduled-functions"

[build.environment]
  NODE_VERSION = "18"

[[functions]]
  schedule = "*/5 * * * *"
  function = "scheduled-notifications"
```

#### Option B: External Cron Service
Use [cron-job.org](https://cron-job.org) to call:
- URL: `https://yourdomain.com/api/notifications/process`
- Method: POST
- Schedule: Every 5 minutes

## Email Templates Included

The system includes professional email templates for:

### Appointment Reminders
- **24-hour reminder**: Full details with date, time, location
- **2-hour reminder**: Urgent styling, brief details

### Lead Notifications
- **New lead alerts**: Sent to admin users immediately
- **Complete lead information**: Contact details, source, priority

## Features

✅ **Automatic scheduling**: Notifications created when appointments/leads are added
✅ **Retry logic**: Failed emails retried up to 3 times
✅ **Professional templates**: Branded emails with company information
✅ **Comprehensive logging**: All notification attempts tracked
✅ **Rate limiting**: Respects API limits with batch processing

## Monthly Usage Estimates

With Resend's free tier (3,000 emails/month):
- **50 appointments/month** = ~100 reminder emails
- **100 new leads/month** = ~100 notification emails (to 1 admin)
- **Leaves ~2,800 emails** for other communications

This should be sufficient for most small to medium commercial real estate operations.

## Upgrading (When Needed)

If you exceed the free tier:
- **Resend Pro**: $20/month for 50,000 emails
- **SendGrid**: Alternative option, $19.95/month for 50,000 emails

## Testing Commands

Test the notification system:

```bash
# Test notification processing
curl -X POST http://localhost:3000/api/notifications/process

# Check notification statistics
curl http://localhost:3000/api/notifications/process
```

## Support

If you need help:
1. Check the notification queue in Supabase for error messages
2. Verify API key in environment variables
3. Ensure "From Email" is verified in Resend dashboard
4. Check email spam/junk folders for test notifications