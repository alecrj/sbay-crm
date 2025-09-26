import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const webhookUrl = process.env.NETLIFY_BUILD_HOOK_URL;

    if (!webhookUrl) {
      console.error('NETLIFY_BUILD_HOOK_URL not configured');
      return NextResponse.json(
        { error: 'Webhook URL not configured' },
        { status: 500 }
      );
    }

    console.log('Property changed - triggering website rebuild...');

    // Trigger Netlify build hook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger: 'property_sync',
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Netlify build hook failed: ${response.status}`);
    }

    console.log('Website rebuild triggered successfully');

    return NextResponse.json({
      success: true,
      message: 'Website rebuild triggered',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Property sync webhook error:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger website rebuild',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}