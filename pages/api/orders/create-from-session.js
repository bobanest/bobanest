import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import Stripe from 'stripe';
import { redeemGiftCardBalance } from '@/lib/giftCardService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await dbConnect();

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const orderId = session.metadata.orderId;
    if (!orderId) return res.status(400).json({ error: 'No orderId in metadata' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Update order with customer details and payment intent
    order.customerName = session.customer_details.name;
    order.customerEmail = session.customer_details.email;
    order.customerPhone = session.customer_details.phone || '';
    order.totalAmount = session.amount_total / 100;
    order.stripePaymentIntentId = session.payment_intent;
    order.paymentStatus = 'paid';
    order.status = 'pending'; // keep as pending until admin confirms
    await order.save();

    if (order.giftCardCode && Number(order.giftCardRedeemedAmount || 0) > 0) {
      await redeemGiftCardBalance({
        code: order.giftCardCode,
        amount: Number(order.giftCardRedeemedAmount || 0),
        channel: 'web',
        orderId: order._id,
        note: `Online checkout payment (${order.trackingNumber})`,
      });
    }

    res.status(200).json({ order });
  } catch (err) {
    console.error('Order update error:', err);
    res.status(500).json({ error: err.message });
  }
}