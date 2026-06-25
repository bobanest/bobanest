import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import FacebookTracking from '@/lib/models/FacebookTracking';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { api: { bodyParser: false } };

async function sendOwnerSMS(message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = process.env.OWNER_PHONE_NUMBER;
  if (!sid || !token || !from || !to) return; // silently skip if not configured
  try {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: message }).toString(),
    });
  } catch (e) {
    console.error('Twilio SMS error:', e.message);
  }
}

async function sendFacebookPurchaseEvent(order) {
  try {
    const fbSettings = await FacebookTracking.findOne();
    if (!fbSettings || !fbSettings.enabled || !fbSettings.pixelId || !fbSettings.accessToken) {
      return; // Facebook tracking not configured
    }

    const contentIds = order.items.map(item => item.id || item._id);
    const contents = order.items.map(item => ({
      id: item.id || item._id,
      quantity: item.quantity,
      item_price: item.price
    }));

    const eventData = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: {
          em: [Buffer.from(order.customerEmail || '').toString('base64')],
          ph: [Buffer.from(order.customerPhone || '').toString('base64')],
          client_ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          client_user_agent: req.headers['user-agent']
        },
        custom_data: {
          value: order.totalAmount,
          currency: 'USD',
          content_ids: contentIds,
          contents: contents,
          content_type: 'product',
          order_id: order.trackingNumber,
          num_items: order.items.reduce((sum, item) => sum + item.quantity, 0)
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
      console.error('Facebook Conversion API error:', await response.text());
    } else {
      console.log('Facebook Purchase event sent for order:', order.trackingNumber);
    }
  } catch (error) {
    console.error('Facebook tracking error:', error);
  }
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  await dbConnect();

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret not configured' });

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        order.customerName = session.customer_details.name;
        order.customerEmail = session.customer_details.email;
        // Preserve phone entered in cart; fall back to Stripe's if we don't have one
        order.customerPhone = order.customerPhone || session.customer_details.phone || session.metadata.customerPhone || '';
        order.totalAmount = session.amount_total / 100; // final total from Stripe
        order.stripePaymentIntentId = session.payment_intent;
        order.paymentStatus = 'paid';
        // appliedPromotions already stored in the temporary order, but we can also parse from metadata
        try {
          const appliedPromotions = JSON.parse(session.metadata.appliedPromotions || '[]');
          order.appliedPromotions = appliedPromotions;
        } catch (e) {}
        await order.save();
        console.log(`Order ${order.trackingNumber} updated after payment.`);

        // Send Facebook Purchase event
        await sendFacebookPurchaseEvent(order);

        // SMS owner
        const itemSummary = (order.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ');
        const smsBody = `🧋 New Order #${order.trackingNumber}!\n${order.customerName} · ${order.customerPhone || 'no phone'}\n${order.orderType.toUpperCase()}\n${itemSummary}\nTotal: $${order.totalAmount.toFixed(2)}`;
        await sendOwnerSMS(smsBody);
      }
    }
  }

  res.status(200).json({ received: true });
}