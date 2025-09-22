// Netlify scheduled function to process CRM notifications
exports.handler = async (event, context) => {
  try {
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
    const apiKey = process.env.CRON_API_KEY;

    const headers = {
      'Content-Type': 'application/json',
    };

    // Add API key if configured
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Call the notification processing endpoint
    const response = await fetch(`${baseUrl}/api/notifications/process`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Notification processing failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Notification processing completed successfully',
        result,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error in scheduled notification processing:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process notifications',
        details: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};