import dbConnect from '@/lib/dbConnect';
import Newsletter from '@/lib/models/Newsletter';
import FacebookTracking from '@/lib/models/FacebookTracking';

async function sendFacebookLeadEvent(req) {
  try {
    await dbConnect();
    const fbSettings = await FacebookTracking.findOne();
    if (!fbSettings || !fbSettings.enabled || !fbSettings.pixelId) {
      return; // Facebook tracking not configured
    }

    const eventData = {
      data: [{
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: {
          em: [Buffer.from(req.body.email || '').toString('base64')],
          client_ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          client_user_agent: req.headers['user-agent']
        },
        custom_data: {
          content_name: 'newsletter_signup',
          content_category: 'newsletter'
        }
      }]
    };

    const response = await fetch(`https://graph.facebook.com/v18.0/${fbSettings.pixelId}/events?access_token=${fbSettings.accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      console.error('Facebook Lead event error:', await response.text());
    } else {
      console.log('Facebook Lead event sent for newsletter signup');
    }
  } catch (error) {
    console.error('Facebook newsletter tracking error:', error);
  }
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    const { email, name } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    try {
      await Newsletter.findOneAndUpdate(
        { email: email.toLowerCase().trim() },
        { $set: { isActive: true }, $setOnInsert: { name: name || '', subscribedAt: new Date() } },
        { upsert: true }
      );

      // Send Facebook Lead event for newsletter signup
      await sendFacebookLeadEvent(req);

      return res.json({ success: true });
    } catch (err) {
      if (err.code === 11000) return res.json({ success: true });
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'GET') {
    const subscribers = await Newsletter.find({ isActive: true }).sort({ subscribedAt: -1 });
    return res.json(subscribers);
  }

  if (req.method === 'DELETE') {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    await Newsletter.findOneAndUpdate({ email: email.toLowerCase() }, { $set: { isActive: false } });
    return res.json({ success: true });
  }

  res.status(405).end();
}
