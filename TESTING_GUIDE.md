# 🧪 Testing Guide - Shallow Bay Advisors CRM

## ✅ What's Ready to Test

### 1. **Calendar Booking System** 🗓️
**Location:** http://localhost:4321/book-appointment

**What to Test:**
- [ ] Fill out appointment booking form
- [ ] Select different appointment types
- [ ] Choose date and time
- [ ] Submit booking
- [ ] Check if lead appears in CRM at http://localhost:3000/leads
- [ ] Verify appointment shows in CRM

### 2. **Profile Settings** ⚙️
**Location:** http://localhost:3000/profile

**What to Test:**
- [ ] Click "Edit Company Info" button (should work now!)
- [ ] Update company information
- [ ] Click "Edit Address" button
- [ ] Update business address details
- [ ] Save changes and verify they persist

### 3. **CRM Settings Panel** 🔧
**Location:** http://localhost:3000/settings

**What to Test:**
- [ ] Update business information
- [ ] Add/remove counties (Miami-Dade, Broward, etc.)
- [ ] Add/remove states
- [ ] Add/remove service areas
- [ ] Modify property types, size ranges, price ranges
- [ ] Save settings and verify they update

### 4. **Lead Management** 📊
**Location:** http://localhost:3000/leads

**What to Test:**
- [ ] Create new lead manually
- [ ] Drag leads between pipeline stages
- [ ] Edit existing leads
- [ ] Search for leads
- [ ] Filter by priority

## 🚀 How to Test Everything

### Step 1: Start Both Applications
```bash
# Terminal 1 - CRM
cd /Users/alec/Desktop/sbay-crm
npm run dev
# Runs at http://localhost:3000

# Terminal 2 - Website
cd /Users/alec/Desktop/sbay
npm run dev
# Runs at http://localhost:4321
```

### Step 2: Test Calendar Booking Flow
1. **Go to:** http://localhost:4321/book-appointment
2. **Fill out the form** with test data
3. **Submit the booking**
4. **Check CRM:** http://localhost:3000/leads
5. **Verify:** New lead appears with appointment details

### Step 3: Test Settings & Configuration
1. **Go to:** http://localhost:3000/settings
2. **Update business info** (company name, email, etc.)
3. **Add a new county** (e.g., "Monroe County")
4. **Add a new property type** (e.g., "Cold Storage")
5. **Save changes** and refresh to verify persistence

### Step 4: Test Profile Editing
1. **Go to:** http://localhost:3000/profile
2. **Click "Edit Company Info"** button
3. **Update some fields** and save
4. **Click "Edit Address"** button
5. **Update address fields** and save
6. **Refresh page** to verify changes persist

## 🐛 Known Issues & Solutions

### Issue: "Error saving lead"
**Solution:** Run this SQL in Supabase:
```sql
CREATE POLICY "Allow anonymous lead creation" ON leads
    FOR INSERT
    WITH CHECK (true);
```

### Issue: Appointment booking fails
**Check:**
- Supabase URL and keys in `/Users/alec/Desktop/sbay/.env`
- Process-appointment function is deployed

### Issue: Settings don't save
**Check:**
- Database connection in CRM
- Settings table exists in Supabase

## 📋 Test Checklist

### ✅ Calendar System
- [ ] Appointment booking form loads
- [ ] Form validation works
- [ ] Different appointment types available
- [ ] Date/time selection works
- [ ] Submission creates lead in CRM
- [ ] Confirmation message appears

### ✅ CRM Settings
- [ ] Business settings page loads
- [ ] Can edit and save company info
- [ ] Can add/remove counties
- [ ] Can add/remove states
- [ ] Can manage property types
- [ ] Settings persist after refresh

### ✅ Profile Management
- [ ] Profile cards show edit buttons
- [ ] Edit modals open and work
- [ ] Can update company information
- [ ] Can update address information
- [ ] Changes save successfully

### ✅ Lead Pipeline
- [ ] Leads display in kanban view
- [ ] Can drag between stages
- [ ] Can create new leads
- [ ] Can edit existing leads
- [ ] Search and filtering works

## 🎯 Success Criteria

**✅ Full Integration Working When:**
1. Calendar booking creates leads in CRM
2. Profile editing saves to database
3. Settings panel manages all configurations
4. Lead pipeline shows real data
5. All forms submit successfully

**🚀 Ready for Production When:**
1. All tests pass
2. Real appointment confirmations work
3. Client can manage all settings
4. Lead capture is reliable
5. Data persists correctly

## 📞 Next Steps After Testing

1. **Property Management:** Add property upload/management
2. **Email Integration:** Set up appointment confirmations
3. **Production Deploy:** Deploy both sites to live URLs
4. **Training:** Show client how to use CRM features

Test everything and let me know what works! 🎉