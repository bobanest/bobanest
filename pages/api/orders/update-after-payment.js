import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import Customer from '@/lib/models/Customer';
import { POINTS_PER_DOLLAR } from '../loyalty';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await dbConnect();

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // If total is already set and paid, skip
    if (order.totalAmount > 0 && order.paymentStatus === 'paid') {
      return res.status(200).json({ order });
    }

    // Compute total from items (including delivery fee and discount)
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = (order.orderType === 'delivery' && !order.appliedPromotions.some(p => p.type === 'free_delivery')) ? 3 : 0;
    const discount = order.appliedPromotions.reduce((sum, p) => sum + p.discountAmount, 0);
    const computedTotal = Math.max(0, subtotal + deliveryFee - discount);
    order.totalAmount = computedTotal;
    order.paymentStatus = 'paid';
    await order.save();

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