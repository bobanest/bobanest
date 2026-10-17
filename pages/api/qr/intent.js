import Order from '@/lib/models/Order';
import { getStripe, priceCart, PricingError, QR_SOURCE } from '@/lib/qrOrder';

function normalizeItems(body) {
  if (Array.isArray(body.items)) return body.items;
  if (body.productId) return [{ id: body.productId, quantity: body.quantity, modifiers: [] }];
  return [];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const priced = await priceCart({ items: normalizeItems(body), pickupLocation: body.pickupLocation });

    if (body.expectedAmount != null && Number(body.expectedAmount) !== priced.amount) {
      return res.status(409).json({ error: 'Prices changed. Please review your order and try again.' });
    }

    const email = String(body.email || '').toLowerCase().trim().slice(0, 200);
    const order = await Order.create({
      customerName: String(body.name || '').slice(0, 120),
      customerEmail: email,
      customerPhone: String(body.phone || '').slice(0, 40),
      items: priced.lines.map(({ name, price, quantity, modifiers }) => ({ name, price, quantity, modifiers })),
      totalAmount: priced.amount / 100,
      orderType: 'pickup',
      pickupLocation: priced.location,
      status: 'pending',
      paymentStatus: 'pending',
      appliedPromotions: priced.appliedPromotions,
    });

    const intent = await getStripe().paymentIntents.create({
      amount: priced.amount,
      currency: 'usd',
      payment_method_types: ['card'],
      description: `Bobanest quick pay order ${order.trackingNumber}`,
      metadata: { orderId: order._id.toString(), source: QR_SOURCE },
    });

    return res.status(200).json({ clientSecret: intent.client_secret, orderId: order._id.toString() });
  } catch (error) {
    if (error instanceof PricingError) return res.status(400).json({ error: error.message });
    console.error('QR intent error:', error);
    return res.status(500).json({ error: 'Unable to start payment. Please try again.' });
  }
}
