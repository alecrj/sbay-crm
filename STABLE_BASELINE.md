# 🎯 STABLE BASELINE - v1.0.0-stable

**Date**: October 3, 2025
**Status**: ✅ FULLY WORKING END-TO-END SYSTEM

## 📋 System Overview

This represents the **stable baseline** for the SBAY Real Estate appointment booking system. Both repos are tagged with `v1.0.0-stable` and this configuration is **fully functional**.

## 🏗️ Repository Information

### CRM (sbay-crm)
- **Commit**: `d2cf9b3` - "Fix email sender to use verified Resend domain"
- **Tag**: `v1.0.0-stable`
- **Deployed URL**: https://sbaycrm.netlify.app

### Website (sbay)
- **Commit**: `e1a0006` - "Add debug logging to see exact data being sent to CRM API"
- **Tag**: `v1.0.0-stable`
- **Deployed URL**: https://shabay.netlify.app

## ✅ Working Features

1. **Calendar System**
   - Shows available booking dates for each property
   - Property-specific availability detection
   - Month navigation and date selection

2. **Appointment Booking**
   - Website form submission → CRM lead creation
   - Cross-domain CORS communication working
   - Lead appears in CRM dashboard instantly
   - Appointment scheduled with proper time conversion

3. **Email Notifications**
   - ✅ Client confirmation email
   - ✅ Admin notification email (to: 99alecrodriguez@gmail.com)
   - ✅ Emails sent from: `Shallow Bay Advisors <onboarding@resend.dev>`

4. **Data Processing**
   - Name field splitting (`name` → `first_name`/`last_name`)
   - Time format conversion (12-hour → 24-hour)
   - Database field validation and filtering
   - Form conflict resolution

## 🔧 Technical Details

### Email Configuration
- **Provider**: Resend
- **Verified Domain**: `onboarding@resend.dev`
- **Admin Email**: `99alecrodriguez@gmail.com`
- **API Key**: Set in `RESEND_API_KEY` environment variable

### Key Files Modified
- `/src/app/api/public/leads/route.ts` - CRM API endpoint
- `/src/components/CalendarBooking.astro` - Website booking form

### Environment Variables (CRM)
```
ADMIN_EMAIL=99alecrodriguez@gmail.com
RESEND_API_KEY=[configured]
NEXT_PUBLIC_SUPABASE_URL=[configured]
SUPABASE_SERVICE_ROLE_KEY=[configured]
```

## 🚨 Rollback Instructions

If the system breaks, rollback to these exact commits:

### CRM Rollback
```bash
cd /Users/alec/desktop/sbay-crm
git checkout v1.0.0-stable
# OR
git reset --hard d2cf9b3
```

### Website Rollback
```bash
cd /Users/alec/Desktop/sbay
git checkout v1.0.0-stable
# OR
git reset --hard e1a0006
```

## 📝 Testing Workflow

To verify system is working:

1. **Go to website**: https://shabay.netlify.app
2. **Navigate to a property** with calendar booking
3. **Select available date and time**
4. **Fill out booking form** with test data
5. **Submit form** - should see success message
6. **Check CRM**: https://sbaycrm.netlify.app/leads
7. **Check emails**: Both client and admin should receive emails

## 💡 Notes for Future Development

- This baseline should be preserved before making any major changes
- Email domain is verified with Resend - do not change sender
- All CORS, time parsing, and field mapping issues are resolved
- System handles cross-domain form submission perfectly
- Debug logging is in place for troubleshooting

---

**Remember**: This is the **working baseline** - always test against this configuration if new changes break the system.