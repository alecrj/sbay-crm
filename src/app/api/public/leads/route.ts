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

    // Extract lead data
    const {
      first_name,
      last_name,
      email,
      phone,
      company,
      property_interest,
      propertyId,
      preferred_date,
      preferred_time,
      message,
      source = 'website',
      type = 'consultation',
      status = 'new',
      // Legacy fields for backwards compatibility
      appointmentDate,
      appointmentTime,
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

    // Use preferred date/time or fall back to legacy appointment fields
    const finalPreferredDate = preferred_date || appointmentDate || null;
    const finalPreferredTime = preferred_time || appointmentTime || null;

    // Format the preferred date for display
    let preferredDateDisplay = '';
    if (finalPreferredDate) {
      try {
        const [year, month, day] = finalPreferredDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        preferredDateDisplay = dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        preferredDateDisplay = finalPreferredDate;
      }
    }

    // Build message with time preference included
    let fullMessage = '';
    if (finalPreferredTime) {
      fullMessage = `Preferred time: ${finalPreferredTime}`;
    }
    if (message) {
      fullMessage = fullMessage ? `${fullMessage}\n\n${message}` : message;
    }

    // Create the lead data
    // Note: consultation_time is a TIME type column, so we store the time preference in message instead
    const leadData = {
      title: `Tour Request - ${first_name} ${last_name}`,
      name: `${first_name} ${last_name}`,
      email,
      phone: phone || null,
      company: company || null,
      property_interest: property_interest || null,
      source,
      status,
      type,
      priority: 'medium',
      consultation_date: finalPreferredDate,
      message: fullMessage || null,
    };

    console.log('Creating lead:', JSON.stringify(leadData, null, 2));

    const { data: leadResult, error: leadError } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      const leadErrorResponse = NextResponse.json(
        { error: 'Failed to create lead', details: leadError.message },
        { status: 500 }
      );
      Object.entries(corsHeaders).forEach(([key, value]) => {
        leadErrorResponse.headers.set(key, value);
      });
      return leadErrorResponse;
    }

    // Fetch property image for email (if propertyId provided)
    let propertyImageUrl = '';
    let propertyDetails = null;
    if (propertyId) {
      try {
        const { data: propertyData } = await supabase
          .from('properties')
          .select('id, title, image, gallery, location, size, price')
          .eq('id', propertyId)
          .single();

        if (propertyData) {
          propertyDetails = propertyData;
          propertyImageUrl = propertyData.image || (propertyData.gallery && propertyData.gallery.length > 0 ? propertyData.gallery[0] : '');
        }
      } catch (err) {
        console.error('Error fetching property:', err);
      }
    }

    // Send confirmation email to lead
    try {
      console.log('Sending confirmation email to:', email);

      const confirmEmailResult = await resend.emails.send({
        from: 'Shallow Bay Advisors <onboarding@resend.dev>',
        to: [email],
        subject: 'Tour Request Received - Shallow Bay Advisors',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background-color: #1E3A5F; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Shallow Bay Advisors</h1>
            </div>

            <div style="padding: 30px;">
              <h2 style="color: #1E3A5F; margin-top: 0;">Thank You, ${first_name}!</h2>

              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                We've received your tour request and appreciate your interest in our properties.
                A member of our team will contact you within <strong>24 hours</strong> to confirm your tour.
              </p>

              ${property_interest ? `
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1E3A5F; margin-top: 0; font-size: 16px;">Property of Interest</h3>
                ${propertyImageUrl ? `
                <img src="${propertyImageUrl}" alt="${property_interest}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 6px; margin-bottom: 15px;" />
                ` : ''}
                <p style="color: #333; margin: 0; font-weight: 600;">${property_interest}</p>
                ${propertyDetails?.location ? `<p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">${propertyDetails.location}</p>` : ''}
              </div>
              ` : ''}

              ${finalPreferredDate || finalPreferredTime ? `
              <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                <h3 style="color: #1E3A5F; margin-top: 0; font-size: 16px;">Your Preferred Time</h3>
                ${preferredDateDisplay ? `<p style="color: #333; margin: 0;"><strong>Date:</strong> ${preferredDateDisplay}</p>` : ''}
                ${finalPreferredTime ? `<p style="color: #333; margin: 5px 0 0 0;"><strong>Time:</strong> ${finalPreferredTime}</p>` : ''}
                <p style="color: #666; font-size: 14px; margin: 10px 0 0 0; font-style: italic;">
                  We'll do our best to accommodate your preferred time.
                </p>
              </div>
              ` : ''}

              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                If you have any immediate questions, feel free to call us at
                <a href="tel:+15616780002" style="color: #2563eb; text-decoration: none; font-weight: 600;">(561) 678-0002</a>.
              </p>

              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                We look forward to showing you around!
              </p>

              <p style="color: #333; margin-top: 30px;">
                Best regards,<br>
                <strong>The Shallow Bay Advisors Team</strong>
              </p>
            </div>

            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                Shallow Bay Advisors | Commercial Real Estate<br>
                <a href="tel:+15616780002" style="color: #2563eb;">(561) 678-0002</a> |
                <a href="mailto:info@shallowbayadvisors.com" style="color: #2563eb;">info@shallowbayadvisors.com</a>
              </p>
            </div>
          </div>
        `
      });
      console.log('Lead confirmation email result:', JSON.stringify(confirmEmailResult, null, 2));
      if (confirmEmailResult.error) {
        console.error('Confirmation email error:', confirmEmailResult.error);
      } else {
        console.log('Lead confirmation email sent successfully, ID:', confirmEmailResult.data?.id);
      }
    } catch (emailError: any) {
      console.error('Error sending lead confirmation email:', emailError?.message || emailError);
    }

    // Send notification email to admin
    try {
      // TODO: Change back to info@shallowbayadvisors.com after testing
      const adminEmail = process.env.ADMIN_EMAIL || '99alecrodriguez@gmail.com';
      console.log('Sending admin notification to:', adminEmail);

      const adminEmailResult = await resend.emails.send({
        from: 'Shallow Bay Advisors <onboarding@resend.dev>',
        to: [adminEmail],
        subject: `New Tour Request - ${first_name} ${last_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc2626; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">New Tour Request</h1>
            </div>

            <div style="padding: 25px; background-color: #ffffff;">
              <p style="color: #333; font-size: 16px; margin-top: 0;">
                A new tour request has been submitted on the website:
              </p>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1E3A5F; margin-top: 0; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Contact Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; width: 120px;"><strong>Name:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${first_name} ${last_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
                    <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Phone:</strong></td>
                    <td style="padding: 8px 0;"><a href="tel:${phone}" style="color: #2563eb;">${phone || 'Not provided'}</a></td>
                  </tr>
                  ${company ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;"><strong>Company:</strong></td>
                    <td style="padding: 8px 0; color: #333;">${company}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              ${property_interest ? `
              <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1E3A5F; margin-top: 0;">Property Interest</h3>
                <p style="color: #333; font-size: 16px; font-weight: 600; margin: 0;">${property_interest}</p>
                ${propertyDetails?.size ? `<p style="color: #666; margin: 5px 0 0 0;">${propertyDetails.size}</p>` : ''}
              </div>
              ` : ''}

              ${finalPreferredDate || finalPreferredTime ? `
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; margin-top: 0;">Requested Time</h3>
                ${preferredDateDisplay ? `<p style="color: #333; margin: 0;"><strong>Date:</strong> ${preferredDateDisplay}</p>` : ''}
                ${finalPreferredTime ? `<p style="color: #333; margin: 5px 0 0 0;"><strong>Time:</strong> ${finalPreferredTime}</p>` : ''}
              </div>
              ` : ''}

              ${message ? `
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1E3A5F; margin-top: 0;">Message</h3>
                <p style="color: #333; margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
              ` : ''}

              <div style="margin-top: 25px; text-align: center;">
                <a href="https://sbaycrm.netlify.app/leads"
                   style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View in CRM
                </a>
              </div>
            </div>

            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                This lead was submitted on ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
              </p>
            </div>
          </div>
        `
      });
      console.log('Admin notification email result:', JSON.stringify(adminEmailResult, null, 2));
      if (adminEmailResult.error) {
        console.error('Admin email error:', adminEmailResult.error);
      } else {
        console.log('Admin notification email sent successfully, ID:', adminEmailResult.data?.id);
      }
    } catch (emailError: any) {
      console.error('Error sending admin notification email:', emailError?.message || emailError);
      console.error('Full error:', JSON.stringify(emailError, null, 2));
    }

    // Log activity
    if (leadResult.id) {
      try {
        await supabase
          .from('lead_activities')
          .insert([{
            lead_id: leadResult.id,
            activity_type: 'lead_created',
            title: 'Tour request submitted',
            description: `Tour request submitted via website${finalPreferredDate ? ` for ${preferredDateDisplay}` : ''}${finalPreferredTime ? ` (${finalPreferredTime})` : ''}`,
            metadata: {
              source: 'website',
              preferred_date: finalPreferredDate,
              preferred_time: finalPreferredTime,
              property_interest
            }
          }]);
      } catch (activityError) {
        console.error('Error logging activity:', activityError);
      }
    }

    const response = NextResponse.json({
      success: true,
      lead: leadResult,
      message: 'Tour request submitted successfully'
    });

    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Error processing tour request:', error);
    const errorResponse = NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );

    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });

    return errorResponse;
  }
}
