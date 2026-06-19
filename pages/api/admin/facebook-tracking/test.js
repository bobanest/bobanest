import dbConnect from '@/lib/dbConnect';
import FacebookTracking from '@/lib/models/FacebookTracking';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Get settings from database or request body
    let settings = await FacebookTracking.findOne();
    const { pixelId: reqPixelId, accessToken: reqAccessToken, testEventCode: reqTestEventCode } = req.body;

    // Use request body values if provided, otherwise use database values
    const pixelId = reqPixelId || settings?.pixelId;
    const accessToken = reqAccessToken || settings?.accessToken;
    const testEventCode = reqTestEventCode || settings?.testEventCode;

    if (!pixelId) {
      return res.status(400).json({ error: 'Facebook tracking not configured. Please set Pixel ID first.' });
    }

    // Send test event to Facebook Conversion API
    const eventData = {
      data: [{
        event_name: 'TestEvent',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: {
          client_ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          client_user_agent: req.headers['user-agent']
        },
        custom_data: {
          test_code: testEventCode || 'manual_test'
        }
      }],
      ...(testEventCode && { test_event_code: testEventCode })
    };

    let url = `https://graph.facebook.com/v18.0/${pixelId}/events`;
    const headers = {
      'Content-Type': 'application/json'
    };

    // Add access token if available
    if (accessToken) {
      url += `?access_token=${accessToken}`;
    } else {
      // If no access token, this will likely fail - provide helpful error
      console.warn('No access token provided for Facebook Conversion API test');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(eventData)
    });

    const result = await response.json();

    if (response.ok) {
      return res.json({ success: true, result, message: 'Test event sent successfully!' });
    } else {
      console.error('Facebook API error:', result);

      // Provide specific error messages based on Facebook error codes
      let errorMessage = 'Facebook API error';
      let troubleshooting = '';

      if (result.error) {
        const { code, message, type } = result.error;

        switch (code) {
          case 190:
            errorMessage = 'Invalid access token';
            troubleshooting = 'Check that your access token is correct and hasn\'t expired.';
            break;
          case 200:
            errorMessage = 'Permissions error';
            troubleshooting = 'Your access token doesn\'t have permission to send events to this pixel.';
            break;
          case 613:
            errorMessage = 'Rate limit exceeded';
            troubleshooting = 'Too many requests. Wait a few minutes and try again.';
            break;
          case 100:
            if (message.includes('pixel')) {
              errorMessage = 'Invalid Pixel ID';
              troubleshooting = 'Check that your Pixel ID is correct.';
            } else {
              errorMessage = message;
            }
            break;
          default:
            errorMessage = message || 'Unknown Facebook API error';
            troubleshooting = 'Check your Pixel ID and access token configuration.';
        }
      }

      return res.status(400).json({
        error: errorMessage,
        details: result.error?.message || result,
        code: result.error?.code,
        troubleshooting: troubleshooting,
        pixelId: pixelId,
        hasAccessToken: !!accessToken
      });
    }
  } catch (error) {
    console.error('Test event error:', error);
    return res.status(500).json({ error: 'Failed to send test event', details: error.message });
  }
}