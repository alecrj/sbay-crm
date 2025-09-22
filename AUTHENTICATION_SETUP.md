# Authentication Setup Guide - Invite Only System

## Current Issue

The "Sign in with Google" button shows "Access by invitation only" because:
1. Google OAuth needs to be configured in Supabase
2. Your admin account needs to be manually added to the database
3. The authentication flow requires proper setup

## Step 1: Configure Google OAuth in Supabase

### 1.1 Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Go to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Choose **Web application**
6. Add these authorized redirect URIs:
   ```
   https://otdstubixarpsirhcpcq.supabase.co/auth/v1/callback
   ```
7. Save and copy your **Client ID** and **Client Secret**

### 1.2 Configure in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `otdstubixarpsirhcpcq`
3. Go to **Authentication** > **Providers**
4. Find **Google** and click **Configure**
5. Enable Google provider
6. Enter your **Client ID** and **Client Secret**
7. Click **Save**

## Step 2: Add Your Admin Account

Since this is invite-only, you need to manually add your admin account to the database.

### 2.1 Option A: Add Through Supabase Dashboard

1. Go to **Authentication** > **Users** in Supabase dashboard
2. Click **Add user**
3. Enter your email: `99alecrodriguez@gmail.com`
4. Set a temporary password
5. Click **Create user**
6. Go to **Database** > **Table editor** > **users** table
7. Find your user and add this data:
   ```
   name: Alec Rodriguez
   role: admin
   email: 99alecrodriguez@gmail.com
   ```

### 2.2 Option B: Add Through SQL (Recommended)

1. Go to **SQL Editor** in Supabase dashboard
2. Run this SQL:

```sql
-- First, create the user in auth.users (if not exists)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  '99alecrodriguez@gmail.com',
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Then add to the users table with admin role
INSERT INTO users (
  id,
  email,
  name,
  role,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = '99alecrodriguez@gmail.com'),
  '99alecrodriguez@gmail.com',
  'Alec Rodriguez',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();
```

## Step 3: Test Google OAuth

1. Go to your CRM login page: `http://localhost:3000/login`
2. Click **Sign in with Google**
3. You should be redirected to Google's OAuth page
4. Sign in with `99alecrodriguez@gmail.com`
5. You should be redirected back and logged in as admin

## Step 4: How to Invite Others (Admin Process)

Since this is invite-only, here's how you (as admin) can add new users:

### 4.1 Add Team Members via SQL

```sql
-- Add a new team member
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'teammember@shallowbayadvisors.com',
  NOW(),
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Add to users table with appropriate role
INSERT INTO users (
  id,
  email,
  name,
  role,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'teammember@shallowbayadvisors.com'),
  'teammember@shallowbayadvisors.com',
  'Team Member Name',
  'agent', -- or 'assistant' or 'admin'
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = NOW();
```

### 4.2 Available Roles

- **admin**: Full access to everything (you)
- **agent**: Can manage leads, properties, appointments
- **assistant**: Limited access, mainly viewing and basic tasks

## Step 5: Troubleshooting

### Issue: "Sign in with Google" doesn't work
**Solution**:
1. Check Google OAuth is enabled in Supabase
2. Verify redirect URI is correct
3. Ensure your account exists in both `auth.users` and `users` tables

### Issue: "Access by invitation only" message
**Solution**:
1. This is expected - it means the system is working correctly
2. Only users manually added to the database can sign in
3. Add yourself first, then add others as needed

### Issue: Signed in but no access to CRM
**Solution**:
1. Check you exist in the `users` table (not just `auth.users`)
2. Verify your `role` is set to `admin`
3. Make sure the user IDs match between both tables

## Step 6: Environment Variables Check

Make sure your `.env.local` has the Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://otdstubixarpsirhcpcq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90ZHN0dWJpeGFycHNpcmhjcGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTk0OTAsImV4cCI6MjA3Mzk5NTQ5MH0.K3mftgyz41BtZ-7GxLHzKapoGN7xK0foXEFFyIYOaBI
```

## Step 7: Production Deployment

For production (Netlify), you'll need to:

1. Add environment variables to Netlify
2. Update Google OAuth redirect URI to your production domain:
   ```
   https://yourdomain.netlify.app/auth/v1/callback
   ```
3. Update Supabase settings with production domain

## What This Achieves

✅ **Secure Access**: Only invited users can access the CRM
✅ **Role-Based Permissions**: Different access levels for team members
✅ **Google Integration**: Easy sign-in with Google accounts
✅ **Admin Control**: You control who gets access
✅ **Professional Setup**: Enterprise-grade authentication

The "Access by invitation only" message is actually a good thing - it means the security is working!