import { Resend } from 'resend';
import FacebookTracking from '@/lib/models/FacebookTracking';
import dbConnect from '@/lib/dbConnect';

const resend = new Resend(process.env.RESEND_API_KEY);

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
          content_name: 'contact_form',
          content_category: 'contact'
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
      console.log('Facebook Lead event sent for contact form');
    }
  } catch (error) {
    console.error('Facebook lead tracking error:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  try {
    // Send Facebook Lead event
    await sendFacebookLeadEvent(req);

    // Send email notification
    const { data, error } = await resend.emails.send({
      from: 'Bobanest <orders@bobanest.com>',
      to: ['orders@bobanest.com'], // Change this to your email
      subject: 'New Contact Form Submission',
      html: `
        <h2>New Contact Form Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    if (error) {
      console.error('Email error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}