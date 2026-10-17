import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import Customer from '@/lib/models/Customer';
import { POINTS_PER_DOLLAR } from '../loyalty';
import { redeemGiftCardBalance } from '@/lib/giftCardService';
import { markCartRecovered } from '@/lib/abandonedCart';

const DELIVERY_FEE_AMOUNT = 4.99;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await dbConnect();

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.paymentStatus === 'paid') {
      return res.status(200).json({ order });
    }

    // Only trust Stripe: the order must have a Checkout session that is actually paid
    if (!order.stripeSessionId) {
      return res.status(402).json({ error: 'Payment not confirmed' });
    }
    const session = await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
    if (session.payment_status !== 'paid' || session.metadata?.orderId !== String(order._id)) {
      return res.status(402).json({ error: 'Payment not confirmed' });
    }

    const computedTotal = (session.amount_total || 0) / 100;
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: { $ne: 'paid' } },
      { $set: { totalAmount: computedTotal, paymentStatus: 'paid' } },
      { new: true }
    );
    if (!claimed) {
      return res.status(200).json({ order: await Order.findById(orderId) });
    }
    order.totalAmount = computedTotal;
    order.paymentStatus = 'paid';
    markCartRecovered(order.customerEmail).catch(() => {});

    if (order.giftCardCode && Number(order.giftCardRedeemedAmount || 0) > 0) {
      await redeemGiftCardBalance({
        code: order.giftCardCode,
        amount: Number(order.giftCardRedeemedAmount || 0),
        channel: 'web',
        orderId: order._id,
        note: `Payment update (${order.trackingNumber})`,
      });
    }

    // Award loyalty points: 1 point per $1 of the final total
    if (order.customerEmail) {
      const pointsEarned = Math.floor(computedTotal * POINTS_PER_DOLLAR);
      if (pointsEarned > 0) {
        await Customer.findOneAndUpdate(
          { email: order.customerEmail.toLowerCase() },
          { $inc: { points: pointsEarned }, $setOnInsert: { name: '', favoriteOrders: [] } },
          { upsert: true }
        );
      }
    }

    // Award referral points (100 pts = $5 each) on first order only
    const REFERRAL_POINTS = 100;
    if (order.referralCode && order.customerEmail) {
      const emailLower = order.customerEmail.toLowerCase();
      const referredCustomer = await Customer.findOne({ email: emailLower });
      // Only award if customer hasn't been referred before
      if (referredCustomer && !referredCustomer.referredBy) {
        const referrer = await Customer.findOne({ referralCode: order.referralCode });
        if (referrer && referrer.email !== emailLower) {
          // Award both parties
          await Customer.findByIdAndUpdate(referrer._id, { $inc: { points: REFERRAL_POINTS } });
          await Customer.findOneAndUpdate(
            { email: emailLower },
            { $set: { referredBy: referrer.email }, $inc: { points: REFERRAL_POINTS } }
          );
        }
      }
    }

    res.status(200).json({ order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}