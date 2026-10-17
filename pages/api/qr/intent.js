import dbConnect from '@/lib/dbConnect';
import Product from '@/lib/models/Product';
import Order from '@/lib/models/Order';
import Location from '@/lib/models/Location';
import StoreHours from '@/lib/models/StoreHours';
import { getStoreStatusAt } from '@/lib/storeHoursHelper';
import { getStripe, QR_SOURCE, MAX_QR_QUANTITY } from '@/lib/qrOrder';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await dbConnect();
    const { productId, quantity, pickupLocation, name, email, phone } = req.body || {};
    const qty = Math.floor(Number(quantity));
    if (!productId || !(qty >= 1 && qty <= MAX_QR_QUANTITY)) {
      return res.status(400).json({ error: 'Invalid item or quantity.' });
    }

    const product = await Product.findById(String(productId)).lean().catch(() => null);
    if (!product || product.inStock === false || !(Number(product.price) > 0)) {
      return res.status(400).json({ error: 'This item is not available right now.' });
    }

    const locationName = String(pickupLocation || '').trim();
    const locations = await Location.find({}).lean();
    const location = locations.find((l) => l.name === locationName && l.isActive !== false && !l.isComingSoon);
    if (!location) return res.status(400).json({ error: 'Please choose a valid pickup location.' });

    const storeHours = await StoreHours.findOne({}).lean();
    if (storeHours && !getStoreStatusAt(storeHours, new Date()).isOpen) {
      return res.status(400).json({ error: 'We are closed right now. Please try again when we are open.' });
    }

    const unitPrice = Math.round(Number(product.price) * 100) / 100;
    const amount = Math.round(unitPrice * qty * 100);

    const order = await Order.create({
      customerName: String(name || '').slice(0, 120),
      customerEmail: String(email || '').toLowerCase().trim().slice(0, 200),
      customerPhone: String(phone || '').slice(0, 40),
      items: [{ name: product.name, price: unitPrice, quantity: qty, modifiers: [] }],
      totalAmount: amount / 100,
      orderType: 'pickup',
      pickupLocation: location.name,
      status: 'pending',
      paymentStatus: 'pending',
    });

    const intent = await getStripe().paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method_types: ['card'],
      description: `Bobanest QR order ${order.trackingNumber}`,
      metadata: { orderId: order._id.toString(), source: QR_SOURCE },
    });

    return res.status(200).json({ clientSecret: intent.client_secret, orderId: order._id.toString() });
  } catch (error) {
    console.error('QR intent error:', error);
    return res.status(500).json({ error: 'Unable to start payment. Please try again.' });
  }
}
