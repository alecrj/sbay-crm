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

    // Extract and validate form data
    const leadData = {
      name: String(data.name || '').trim(),
      email: String(data.email || '').trim().toLowerCase(),
      phone: String(data.phone || '').trim() || null,
      company: String(data.company || '').trim() || null,
      property_interest: String(data.property_interest || data.propertyInterest || '').trim() || null,
      space_requirements: String(data.space_requirements || data.spaceRequirements || '').trim() || null,
      budget: String(data.budget || '').trim() || null,
      timeline: String(data.timeline || '').trim() || null,
      message: String(data.message || data.comments || data.notes || '').trim() || null,

      // System fields with defaults
      title: String(data.title || '').trim() || `Website Inquiry - ${data.name}`,
      type: (data.type || 'contact-form') as any,
      status: 'new' as const,
      priority: (data.priority || 'medium') as any,
      source: (data.source || 'website') as any,

      // Additional fields
      consultation_date: data.consultation_date || null,
      consultation_time: data.consultation_time || null,
      follow_up_date: data.follow_up_date || null,
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

    // Log initial activity
    await supabase
      .from('lead_activities')
      .insert([{
        lead_id: newLead.id,
        activity_type: 'note',
        title: 'Lead created',
        description: `New lead created from website form submission`,
        metadata: {
          source: leadData.source,
          type: leadData.type,
          form_data: data
        }
      }]);

    // Send notification for new lead
    try {
      const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_lead',
          data: {
            leadId: newLead.id,
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            company: leadData.company,
            source: leadData.source,
            priority: leadData.priority,
          }
        }),
      });

      if (!notificationResponse.ok) {
        throw new Error(`Notification API returned ${notificationResponse.status}`);
      }
    } catch (notificationError) {
      console.error('Failed to send notification for new lead:', notificationError);
      // Don't fail the lead creation for notification errors
    }

    return response.json(
      {
        success: true,
        leadId: newLead.id,
        action: 'created',
        message: 'Lead created successfully'
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