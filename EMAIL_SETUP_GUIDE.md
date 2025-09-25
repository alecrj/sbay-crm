# 📧 Email Notification Setup Guide

Choose your email method - all options are **FREE** to start!

## 🆓 **Option 1: Resend (Recommended - FREE)**

✅ **3,000 emails/month FREE**
✅ Professional delivery
✅ No credit card required

### Setup Steps:
1. **Sign up**: Go to [resend.com](https://resend.com)
2. **Get API key**: Copy from dashboard
3. **Update `.env.local`**:
```bash
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
NEXT_PUBLIC_ADMIN_EMAIL=your-email@gmail.com
```

---

## 🆓 **Option 2: Gmail (100% FREE)**

✅ **Unlimited emails**
✅ Use your existing Gmail
✅ Sends from your Gmail address

### Setup Steps:
1. **Enable 2FA**: In your Google account
2. **Get App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Update `.env.local`**:
```bash
EMAIL_PROVIDER=gmail
GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=your.email@gmail.com
NEXT_PUBLIC_ADMIN_EMAIL=your.email@gmail.com
```

---

## 🆓 **Option 3: Any Email Provider (FREE)**

✅ **Use any email service**
✅ Yahoo, Outlook, custom domain
✅ SMTP configuration

### Setup Steps:
1. **Get SMTP settings** from your email provider
2. **Update `.env.local`**:
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@domain.com
SMTP_PASS=your_password_or_app_password
EMAIL_FROM=your.email@domain.com
NEXT_PUBLIC_ADMIN_EMAIL=your.email@domain.com
```

---

## 🧪 **Test Your Setup**

1. **Restart your dev server**: `npm run dev`
2. **Create a test lead** in the CRM
3. **Check your email** - you should receive:
   - Admin alert email (professional template)
   - Browser notification (if enabled)

---

## 🚀 **For Your Client**

Simply update these values in `.env.local`:

```bash
# Update to your client's email
NEXT_PUBLIC_ADMIN_EMAIL=client@theirbusiness.com

# Choose their preferred email method
EMAIL_PROVIDER=gmail  # or resend, smtp
```

The system automatically sends from their configured email address - **no technical setup needed from them!**

---

## 📞 **Need Help?**

- **Gmail issues**: Make sure 2FA is enabled and you're using an app password
- **SMTP issues**: Double-check host, port, and credentials
- **Resend issues**: Verify API key is correct and domain is configured

**The system will work with any email provider - choose what's easiest for you!** 🎉