import dbConnect from '@/lib/dbConnect';
import Customer from '@/lib/models/Customer';
import Order from '@/lib/models/Order';
import FacebookTracking from '@/lib/models/FacebookTracking';

async function sendFacebookCompleteRegistrationEvent(req) {
  try {
    await dbConnect();
    const fbSettings = await FacebookTracking.findOne();
    if (!fbSettings || !fbSettings.enabled || !fbSettings.pixelId) {
      return; // Facebook tracking not configured
    }

    const eventData = {
      data: [{
        event_name: 'CompleteRegistration',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: {
          em: [Buffer.from(req.body.email || '').toString('base64')],
          client_ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          client_user_agent: req.headers['user-agent']
        },
        custom_data: {
          content_name: 'loyalty_program',
          content_category: 'loyalty'
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
      console.error('Facebook CompleteRegistration event error:', await response.text());
    } else {
      console.log('Facebook CompleteRegistration event sent for loyalty signup');
    }
  } catch (error) {
    console.error('Facebook registration tracking error:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  await dbConnect();
  const emailLower = email.toLowerCase().trim();

  const customer = await Customer.findOne({ email: emailLower });
  if (!customer) {
    return res.status(404).json({
      error: 'No account found for this email. Place an order to start earning points!',
    });
  }

  if (!customer.verificationCode || customer.verificationCode !== code.trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
  }

  if (!customer.verificationCodeExpiry || new Date() > customer.verificationCodeExpiry) {
    return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
  }

  // Send Facebook CompleteRegistration event
  await sendFacebookCompleteRegistrationEvent(req);

  // Clear the code after successful verification
  await Customer.updateOne(
    { email: emailLower },
    { $unset: { verificationCode: '', verificationCodeExpiry: '' } }
  );

  // Fetch recent orders
  const orders = await Order.find({ customerEmail: emailLower, paymentStatus: 'paid' })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.status(200).json({
    customer: {
      email: customer.email,
      name: customer.name,
      points: customer.points,
      favoriteOrders: customer.favoriteOrders,
    },
    orders,
  });
}
