exports.handler = async (event, context) => {
  // Only run for scheduled events
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_API_KEY}`
      }
    });

    const result = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        result: result
      })
    };
  } catch (error) {
    console.error('Cron job error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};