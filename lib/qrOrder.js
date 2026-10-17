import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import Customer from '@/lib/models/Customer';
import { sendOwnerEmail } from '@/lib/ownerEmail';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const QR_SOURCE = 'qr';
export const MAX_QR_QUANTITY = 10;

export function getStripe() {
  return stripe;
}

// Marks a QR order paid once Stripe confirms the PaymentIntent. Safe to call repeatedly (webhook + return page).
export async function finalizeQrOrder(paymentIntentId) {
  await dbConnect();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
  if (pi.status !== 'succeeded' || pi.metadata?.source !== QR_SOURCE || !pi.metadata?.orderId) return null;

  const billing = pi.latest_charge?.billing_details || {};
  const email = String(billing.email || pi.receipt_email || '').toLowerCase().trim();
  const total = (pi.amount_received || pi.amount) / 100;

  const set = {
    paymentStatus: 'paid',
    stripePaymentIntentId: pi.id,
    totalAmount: total,
  };
  const order = await Order.findOneAndUpdate(
    { _id: pi.metadata.orderId, paymentStatus: { $ne: 'paid' } },
    { $set: set },
    { new: true }
  );

  if (!order) {
    return Order.findById(pi.metadata.orderId).lean();
  }

  // Contact details come from the wallet sheet (Apple Pay / Google Pay)
  if (billing.name) order.customerName = billing.name;
  if (email) order.customerEmail = email;
  if (billing.phone) order.customerPhone = billing.phone;
  await order.save();

  if (email) {
    const points = Math.floor(total);
    if (points > 0) {
      await Customer.findOneAndUpdate(
        { email },
        { $inc: { points }, $setOnInsert: { name: order.customerName || '', favoriteOrders: [] } },
        { upsert: true }
      ).catch(() => {});
    }
  }

  const itemsHtml = (order.items || [])
    .map((item) => `<li>${item.quantity || 1}x ${item.name || 'Item'} - $${Number(item.price || 0).toFixed(2)}</li>`)
    .join('');
  sendOwnerEmail({
    subject: `QR Order Paid: #${order.trackingNumber}`,
    html: `
      <h3>QR Order Payment Confirmed (Apple Pay / Google Pay)</h3>
      <p><strong>Tracking #:</strong> ${order.trackingNumber}</p>
      <p><strong>Customer:</strong> ${order.customerName || 'N/A'}</p>
      <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
      <p><strong>Pickup location:</strong> ${order.pickupLocation || 'N/A'}</p>
      <p><strong>Total:</strong> $${Number(order.totalAmount || 0).toFixed(2)}</p>
      <ul>${itemsHtml}</ul>
    `,
  }).catch(() => {});

  return order.toObject();
}
