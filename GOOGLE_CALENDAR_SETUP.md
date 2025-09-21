# Google Calendar API Setup Guide

This guide will help you set up Google Calendar integration for the Shallow Bay Advisors CRM.

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID

## Step 2: Enable the Google Calendar API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

## Step 3: Create OAuth2 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Add these authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)
5. Save and note your **Client ID** and **Client Secret**

## Step 4: Get Refresh Token

You'll need to authorize your application to access Google Calendar. Here's a simple way:

### Option A: Using Google OAuth2 Playground

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. In the left panel, find "Calendar API v3"
6. Select `https://www.googleapis.com/auth/calendar`
7. Click "Authorize APIs"
8. Complete the authorization flow
9. Click "Exchange authorization code for tokens"
10. Copy the **Refresh Token**

### Option B: Create an Authorization URL

Create a script to generate an authorization URL:

```javascript
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:3000/api/auth/callback/google'
);

const scopes = ['https://www.googleapis.com/auth/calendar'];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
});

console.log('Authorize this app by visiting this url:', url);
```

## Step 5: Configure Environment Variables

Update your `.env.local` file:

```env
# Google Calendar API Configuration
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
GOOGLE_REFRESH_TOKEN=your-refresh-token-here
```

## Step 6: Test the Integration

1. Start your development server: `npm run dev`
2. Go to the Calendar page in your CRM
3. Try creating a new appointment
4. Check that it appears in your Google Calendar

## Troubleshooting

### Common Issues:

1. **"Access blocked" error**: Make sure your OAuth consent screen is configured
2. **"Redirect URI mismatch"**: Ensure the redirect URI in your OAuth client matches exactly
3. **"Invalid grant" error**: Your refresh token may have expired, generate a new one
4. **Permission errors**: Make sure the Google Calendar API is enabled

### Required Scopes:

- `https://www.googleapis.com/auth/calendar` - Full access to calendars
- `https://www.googleapis.com/auth/calendar.events` - Access to events only (alternative)

## Security Notes

- Never commit your `.env.local` file to version control
- Use different credentials for development and production
- Regularly rotate your client secrets
- Consider implementing user-specific OAuth for multi-user scenarios

## Features Included

✅ Create calendar events with automatic Google Calendar sync
✅ Update existing appointments
✅ Delete appointments (removes from both CRM and Google Calendar)
✅ Automatic reminders (24 hours and 2 hours before)
✅ Lead association with appointments
✅ Activity logging for all appointment actions
✅ Time zone support (currently set to America/New_York)

## Next Steps

Once Google Calendar is working, you can:
1. Set up email notifications using the notification system
2. Add SMS reminders
3. Implement availability checking for booking conflicts
4. Add recurring appointment support