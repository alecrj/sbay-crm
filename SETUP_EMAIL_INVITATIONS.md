# Email Invitation System Setup

## Required Environment Variable

To enable the email invitation system, you need to add the Supabase Service Role Key to your environment variables.

### Netlify Environment Variables

1. **Go to Netlify Dashboard**
2. **Navigate to:** Site settings → Environment variables
3. **Add new variable:**
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Your Supabase service role key (get from Supabase dashboard → Settings → API)

### Where to find the Service Role Key:

1. **Go to your Supabase Dashboard**
2. **Navigate to:** Settings → API
3. **Copy the "service_role" key** (not the anon key)
4. **⚠️ Important:** This key has admin privileges - keep it secure

### How the Email Invitation System Works:

1. **Admin sends invitation** via CRM
2. **System automatically emails** secure invitation link
3. **User clicks link** → account automatically created
4. **User is logged in** immediately
5. **No manual signup** possible - invitation-only access

### Security Features:

- ✅ Invitations expire in 7 days
- ✅ One-time use secure tokens
- ✅ Only invited emails can create accounts
- ✅ Roles automatically assigned
- ✅ Duplicate email protection
- ✅ Admin-only invitation sending