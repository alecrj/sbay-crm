# Lead Creation Fix Instructions

## Issue
The "Error saving lead. Please try again." message occurs because:

1. **Row Level Security (RLS)** is enabled on the `leads` table in Supabase
2. The current policy requires authentication: `auth.role() = 'authenticated'`
3. No user is currently authenticated in the CRM

## Solution Options

### Option 1: Quick Fix - Allow Anonymous Lead Creation (Recommended for Testing)
Run this SQL in your Supabase SQL editor to temporarily allow anonymous lead creation:

```sql
-- Create a temporary policy for anonymous lead creation
CREATE POLICY "Allow anonymous lead creation" ON leads
    FOR INSERT
    WITH CHECK (true);
```

This allows anyone to create leads without authentication, which is useful for:
- Testing the CRM functionality
- Receiving leads from your website contact forms
- Initial setup and data entry

### Option 2: Implement Authentication
Set up Supabase Auth to require users to log in before creating leads.

### Option 3: Disable RLS Temporarily
```sql
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
```

## Steps to Fix Now

1. Go to your Supabase project: https://otdstubixarpsirhcpcq.supabase.co
2. Navigate to SQL Editor
3. Run the SQL from Option 1 above
4. Test lead creation in your CRM

## Long-term Solution
For production, you'll want to:
1. Implement proper authentication
2. Create appropriate RLS policies
3. Set up user roles and permissions

The current policy structure is good for production but needs authentication first.