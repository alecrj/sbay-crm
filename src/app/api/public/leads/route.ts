import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client for public API (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CORS headers for cross-origin requests from the public website
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_WEBSITE_URL || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Add CORS headers
    const response = NextResponse;

    // Validate API key if provided
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.PUBLIC_API_KEY;

    if (expectedApiKey && apiKey !== expectedApiKey) {
      return response.json(
        { error: 'Invalid API key' },
        { status: 401, headers: corsHeaders }
      );
    }

    const data = await request.json();

    // Validate required fields
    const { name, email } = data;
    if (!name || !email) {
      return response.json(
        { error: 'Name and email are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return response.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if this is an appointment booking
    const isAppointmentBooking = data.appointment_date && data.appointment_time && data.appointment_type;

    // Extract and validate form data
    const leadData = {
      name: String(data.name || '').trim(),
      email: String(data.email || '').trim().toLowerCase(),
      phone: String(data.phone || '').trim() || null,
      company: String(data.company || '').trim() || null,
      property_interest: String(data.property_interest || data.propertyInterest || data.property_title || '').trim() || null,
      space_requirements: String(data.space_requirements || data.spaceRequirements || '').trim() || null,
      budget: String(data.budget || '').trim() || null,
      timeline: String(data.timeline || '').trim() || (isAppointmentBooking ? 'Immediate - Appointment scheduled' : null),
      message: String(data.message || data.comments || data.notes || '').trim() || null,

      // System fields with defaults
      title: String(data.title || '').trim() || (isAppointmentBooking ? `Appointment - ${data.name}` : `Website Inquiry - ${data.name}`),
      type: (data.type || (isAppointmentBooking ? 'consultation' : 'contact-form')) as any,
      status: 'new' as const,
      priority: (data.priority || (isAppointmentBooking ? 'high' : 'medium')) as any,
      source: (data.source || (isAppointmentBooking ? 'appointment_booking' : 'website')) as any,

      // Additional fields
      consultation_date: data.consultation_date || data.appointment_date || null,
      consultation_time: data.consultation_time || data.appointment_time || null,
      follow_up_date: data.follow_up_date || data.appointment_date || null,
    };

    // Normalize priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(leadData.priority)) {
      leadData.priority = 'medium' as any;
    }

    // Normalize type
    const validTypes = ['consultation', 'property-inquiry', 'general-inquiry', 'contact-form'];
    if (!validTypes.includes(leadData.type)) {
      leadData.type = 'contact-form' as any;
    }

    // Normalize source
    const validSources = ['website', 'referral', 'cold-call', 'email-campaign', 'social-media', 'trade-show', 'other'];
    if (!validSources.includes(leadData.source)) {
      leadData.source = 'website' as any;
    }

    // Check for existing lead with same email
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, name, created_at')
      .eq('email', leadData.email)
      .single();

    if (existingLead) {
      // Update existing lead with new information
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update({
          name: leadData.name,
          phone: leadData.phone,
          company: leadData.company,
          property_interest: leadData.property_interest,
          space_requirements: leadData.space_requirements,
          budget: leadData.budget,
          timeline: leadData.timeline,
          message: leadData.message,
          title: leadData.title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating existing lead:', updateError);
        return response.json(
          { error: 'Failed to update lead information' },
          { status: 500, headers: corsHeaders }
        );
      }

      // Log activity for existing lead update
      await supabase
        .from('lead_activities')
        .insert([{
          lead_id: existingLead.id,
          activity_type: 'note',
          title: 'Lead information updated',
          description: `Lead information updated from website form submission`,
          metadata: {
            source: leadData.source,
            type: leadData.type,
            updated_fields: ['name', 'phone', 'company', 'property_interest', 'space_requirements', 'budget', 'timeline', 'message']
          }
        }]);

      return response.json(
        {
          success: true,
          leadId: existingLead.id,
          action: 'updated',
          message: 'Lead information updated successfully'
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Create new lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating lead:', insertError);
      return response.json(
        { error: 'Failed to create lead' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!newLead) {
      return response.json(
        { error: 'Lead creation failed' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Create appointment if this is an appointment booking
    let newAppointment = null;
    if (isAppointmentBooking) {
      try {
        // Get appointment type details
        const appointmentTypes = {
          'consultation': { label: 'Initial Consultation', duration: 30 },
          'property-viewing': { label: 'Property Viewing', duration: 45 },
          'portfolio-review': { label: 'Portfolio Review', duration: 60 },
          'market-analysis': { label: 'Market Analysis', duration: 45 }
        };

        const typeInfo = appointmentTypes[data.appointment_type as keyof typeof appointmentTypes] ||
                        { label: 'Consultation', duration: 30 };

        // Convert appointment date/time to proper ISO format
        const appointmentDateTime = new Date(`${data.appointment_date}T${convertToTimeString(data.appointment_time)}`);
        const endDateTime = new Date(appointmentDateTime.getTime() + (typeInfo.duration * 60 * 1000));

        const appointmentRecord = {
          lead_id: newLead.id,
          title: `${typeInfo.label} - ${leadData.name}`,
          description: `${typeInfo.label} appointment with ${leadData.name}${leadData.company ? ` from ${leadData.company}` : ''}${leadData.property_interest ? ` regarding ${leadData.property_interest}` : ''}`,
          start_time: appointmentDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: 'Office or Virtual (TBD)',
          attendees: [leadData.email],
          status: 'scheduled'
        };

        // Insert appointment into database
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .insert([appointmentRecord])
          .select()
          .single();

        if (appointmentError) {
          console.error('Error creating appointment:', appointmentError);
        } else {
          newAppointment = appointmentData;
          console.log(`Appointment created with ID: ${newAppointment.id}`);
        }
      } catch (appointmentError) {
        console.error('Error in appointment creation:', appointmentError);
      }
    }

    // Log initial activity
    await supabase
      .from('lead_activities')
      .insert([{
        lead_id: newLead.id,
        activity_type: 'note',
        title: isAppointmentBooking ? 'Appointment booked' : 'Lead created',
        description: isAppointmentBooking ?
          `${data.appointment_type} appointment scheduled for ${data.appointment_date} at ${data.appointment_time}` :
          `New lead created from website form submission`,
        metadata: {
          source: leadData.source,
          type: leadData.type,
          form_data: data,
          appointment_id: newAppointment?.id || null,
          appointment_type: data.appointment_type || null
        }
      }]);

    // Send email notification for new lead
    try {
      const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_lead',
          leadData: {
            id: newLead.id,
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            company: leadData.company,
            property_interest: leadData.property_interest,
            space_requirements: leadData.space_requirements,
            budget: leadData.budget,
            timeline: leadData.timeline,
            message: leadData.message,
            source: leadData.source,
            priority: leadData.priority,
          },
          adminEmail: process.env.ADMIN_EMAIL || '99alecrodriguez@gmail.com'
        }),
      });

      if (!notificationResponse.ok) {
        throw new Error(`Notification API returned ${notificationResponse.status}`);
      }
    } catch (notificationError) {
      console.error('Failed to send email notification for new lead:', notificationError);
      // Don't fail the lead creation for notification errors
    }

    // Create internal CRM notification
    try {
      const internalNotificationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/internal-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_lead',
          title: `New Lead: ${leadData.name}`,
          message: `${leadData.name}${leadData.company ? ` from ${leadData.company}` : ''} submitted a ${leadData.type.replace('-', ' ')} via ${leadData.source}`,
          leadId: newLead.id,
          actionUrl: `/leads/${newLead.id}`,
          metadata: {
            priority: leadData.priority,
            source: leadData.source,
            type: leadData.type,
            property_interest: leadData.property_interest
          }
        }),
      });

      if (!internalNotificationResponse.ok) {
        console.error('Internal notification API error:', internalNotificationResponse.status);
      } else {
        console.log('Internal CRM notification created for new lead:', newLead.id);
      }
    } catch (internalNotificationError) {
      console.error('Failed to create internal notification for new lead:', internalNotificationError);
      // Don't fail the lead creation for notification errors
    }

    return response.json(
      {
        success: true,
        leadId: newLead.id,
        appointmentId: newAppointment?.id || null,
        action: 'created',
        message: isAppointmentBooking ? 'Appointment booked successfully' : 'Lead created successfully'
      },
      { status: 201, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error processing lead submission:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process lead submission'
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helper function to convert time string to ISO time format
function convertToTimeString(timeStr: string): string {
  // Convert "9:00 AM" to "09:00:00"
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');

  let hoursNum = parseInt(hours);
  if (period === 'PM' && hoursNum !== 12) {
    hoursNum += 12;
  } else if (period === 'AM' && hoursNum === 12) {
    hoursNum = 0;
  }

  return `${hoursNum.toString().padStart(2, '0')}:${minutes}:00`;
}