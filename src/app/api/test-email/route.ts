import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const { email, type = 'test' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }

    console.log('Testing email to:', email, 'Type:', type);

    let success = false;

    if (type === 'lead') {
      // Test lead notification
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

      success = await NotificationService.sendNewLeadNotificationToAdmin(
        testLeadData,
        email
      );
    } else {
      // Test basic email
      success = await NotificationService.sendEmail(
        email,
        'Test Email from Shallow Bay CRM',
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🎉 Test Email Success!</h2>
          <p>Hello there,</p>
          <p>This is a test email from your Shallow Bay CRM system. If you're receiving this, your email system is working correctly!</p>
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>✅ System Status</h3>
            <p><strong>Email Provider:</strong> ${process.env.EMAIL_PROVIDER || 'resend'}</p>
            <p><strong>From Address:</strong> ${process.env.EMAIL_FROM || 'noreply@yourdomain.com'}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>Best regards,<br>Your CRM System</p>
        </div>
        `,
        `Test Email Success!

Hello there,

This is a test email from your Shallow Bay CRM system. If you're receiving this, your email system is working correctly!

System Status:
- Email Provider: ${process.env.EMAIL_PROVIDER || 'resend'}
- From Address: ${process.env.EMAIL_FROM || 'noreply@yourdomain.com'}
- Test Time: ${new Date().toLocaleString()}

Best regards,
Your CRM System`
      );
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        provider: process.env.EMAIL_PROVIDER || 'resend',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email'
      }, { status: 500 });
    }

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

  // Check if API key is configured
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