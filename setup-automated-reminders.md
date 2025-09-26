# Automated Appointment Reminder Setup

## 1. Database Setup

First, run the SQL script to create the required tables and functions:

```sql
-- Run this in your Supabase SQL editor
-- File: /Users/alec/Desktop/sbay-crm/database-migrations/create_scheduled_reminders_system.sql
```

## 2. Environment Variables

Add these to your `.env.local` file:

```env
# Cron job security
CRON_SECRET=your-very-secure-random-string-here

# Make sure these are set for the notification system
NEXT_PUBLIC_APP_URL=https://your-crm-domain.netlify.app
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 3. Cron Job Setup

You need to set up a cron job to call the reminder processing endpoint every 10 minutes.

### Recommended: Using External Cron Service

Use services like:
- **EasyCron.com** (Free tier available)
- **Cron-job.org** (Free)
- **UptimeRobot** (Free with monitoring)

Set up a cron job that calls:
```
POST https://your-crm-domain.netlify.app/api/cron/process-reminders
Headers:
  x-cron-secret: your-very-secure-random-string-here
```

Schedule: `*/10 * * * *` (every 10 minutes)

## 4. Test the System

### Manual Test:
```bash
curl -X POST https://your-crm-domain.netlify.app/api/cron/process-reminders \
  -H "x-cron-secret: your-very-secure-random-string-here" \
  -H "Content-Type: application/json"
```

### Check Logs:
- Monitor your hosting platform's function logs
- Check Supabase logs for database operations
- Look at the `scheduled_reminders` table to see reminder status

## 5. Monitoring & Maintenance

### Database Queries for Monitoring:

```sql
-- Check pending reminders
SELECT
  sr.*,
  a.title,
  a.start_time,
  l.name,
  l.email
FROM scheduled_reminders sr
JOIN appointments a ON sr.appointment_id = a.id
JOIN leads l ON a.lead_id = l.id
WHERE sr.status = 'pending'
ORDER BY sr.scheduled_for;

-- Check failed reminders
SELECT * FROM scheduled_reminders
WHERE status = 'failed'
ORDER BY updated_at DESC;

-- Clean up old reminders (run monthly)
DELETE FROM scheduled_reminders
WHERE created_at < NOW() - INTERVAL '30 days';
```

### Dashboard View:
You can create a simple admin dashboard to monitor:
- Pending reminders count
- Failed reminders that need attention
- Recent reminder activity

## Troubleshooting

1. **Reminders not being sent**: Check cron job logs and verify CRON_SECRET
2. **Database errors**: Ensure service role key has proper permissions
3. **Email failures**: Check notification service configuration
4. **Timezone issues**: All times are stored in UTC, ensure proper conversion

## Security Notes

- Never expose your CRON_SECRET in client-side code
- Use environment variables for all sensitive configuration
- The cron endpoint is protected and only processes authorized requests
- All email links have expiration dates for security