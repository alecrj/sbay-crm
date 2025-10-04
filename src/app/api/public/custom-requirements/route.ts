import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Use service role client for admin access (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Extract data
    const {
      first_name,
      last_name,
      email,
      phone,
      company,
      message,
      source = 'website',
      status = 'new',
      type = 'contact-form',
      ...otherData
    } = data;

    // Validate required fields
    if (!first_name || !last_name || !email) {
      const validationResponse = NextResponse.json(
        { error: 'Missing required fields: first_name, last_name, email' },
        { status: 400 }
      );

      Object.entries(corsHeaders).forEach(([key, value]) => {
        validationResponse.headers.set(key, value);
      });

      return validationResponse;
    }

    // Create the lead data
    const leadData = {
      title: `Custom Requirements - ${first_name} ${last_name}`,
      name: `${first_name} ${last_name}`,
      email,
      phone,
      company,
      message,
      source,
      status,
      type,
      priority: 'medium',
      ...otherData
    };

    console.log('Creating custom requirements lead:', JSON.stringify(leadData, null, 2));

    const { data: leadResult, error: leadError } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      const leadErrorResponse = NextResponse.json(
        { error: 'Failed to create lead', details: leadError.message, hint: leadError.hint, code: leadError.code },
        { status: 500 }
      );

      Object.entries(corsHeaders).forEach(([key, value]) => {
        leadErrorResponse.headers.set(key, value);
      });

      return leadErrorResponse;
    }

    // Send notification email to admin ONLY (no customer email)
    try {
      console.log('Sending admin notification for custom requirements');

      await resend.emails.send({
        from: 'Shallow Bay Advisors <onboarding@resend.dev>',
        to: [process.env.ADMIN_EMAIL!],
        subject: 'New Custom Requirements Submission - Shallow Bay Advisors',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a8a;">New Custom Requirements Submission</h2>
            <p>A potential client has submitted custom property requirements through the "Didn't Find What You're Looking For?" form:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e3a8a;">
              <p><strong>Client:</strong> ${first_name} ${last_name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
              ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
              ${message ? `<p><strong>Requirements:</strong><br>${message}</p>` : ''}
            </div>
            <p>This lead has been added to the CRM in the "Lead Form" pipeline stage.</p>
            <p style="margin-top: 20px;">
              <strong>Next Steps:</strong><br>
              • Review their requirements in the CRM dashboard<br>
              • Search for matching properties in your inventory<br>
              • Reach out within 24 hours to discuss options
            </p>
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
              <strong>Shallow Bay Advisors</strong><br>
              Commercial Real Estate CRM System
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Error sending admin email:', emailError);
      // Don't fail the request if email fails
    }

    // Log activity
    if (leadResult.id) {
      await supabase
        .from('lead_activities')
        .insert([{
          lead_id: leadResult.id,
          activity_type: 'note',
          title: 'Custom requirements submitted',
          description: `${first_name} ${last_name} submitted custom property requirements via contact form`,
          metadata: {
            source: 'custom_requirements_form',
            submission_date: new Date().toISOString()
          }
        }]);
    }

    const response = NextResponse.json({
      success: true,
      lead: leadResult
    });

    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Error processing custom requirements:', error);
    const errorResponse = NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );

    // Add CORS headers to error response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });

    return errorResponse;
  }
}
