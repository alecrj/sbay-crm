import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notifications';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const { email, type = 'test', emailId } = await request.json();

    // Check delivery status of a previously sent email
    if (type === 'status' && emailId) {
      const resend = new Resend(process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY);
      const emailData = await resend.emails.get(emailId);
      return NextResponse.json({
        emailId,
        ...emailData,
        timestamp: new Date().toISOString()
      });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }

    console.log('Testing email to:', email, 'Type:', type);

    // Use raw diagnostic method to see exact Resend response
    if (type === 'diagnostic') {
      const result = await NotificationService.sendTestEmailRaw(email);
      return NextResponse.json({
        ...result,
        to: email,
        timestamp: new Date().toISOString()
      });
    }

    let success = false;

    if (type === 'lead') {
      const testLeadData = {
        id: 'test-lead-id',
        name: 'Test Lead',
        email: email,
        company: 'Test Company',
        phone: '+1234567890',
        source: 'website',
        priority: 'high',
        property_interest: 'Office Space'
      };
      success = await NotificationService.sendNewLeadNotificationToAdmin(testLeadData, email);
    } else {
      success = await NotificationService.sendEmail(
        email,
        'Test Email from Shallow Bay CRM',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email</h2>
          <p>This is a test email to <strong>${email}</strong>.</p>
          <p><strong>Provider:</strong> ${process.env.EMAIL_PROVIDER || 'resend'}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>`,
        `Test email to ${email} at ${new Date().toLocaleString()}`
      );
    }

    return NextResponse.json({
      success,
      message: success ? `Email sent to ${email}` : `Failed to send to ${email}`,
      provider: process.env.EMAIL_PROVIDER || 'resend',
      timestamp: new Date().toISOString()
    }, { status: success ? 200 : 500 });

  } catch (error) {
    console.error('Error in test email endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const provider = process.env.EMAIL_PROVIDER || 'resend';
  const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@yourdomain.com';

  let apiKeyConfigured = false;
  if (provider === 'resend') {
    apiKeyConfigured = !!(process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY);
  } else if (provider === 'gmail') {
    apiKeyConfigured = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  } else if (provider === 'smtp') {
    apiKeyConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  return NextResponse.json({
    status: 'Email system status',
    provider,
    fromEmail,
    apiKeyConfigured,
    environment: {
      hasResendKey: !!(process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY),
      hasGmailConfig: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
      hasSmtpConfig: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    },
    timestamp: new Date().toISOString()
  });
}
