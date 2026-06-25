import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';

// GET /api/orders/by-email?email=x  -> returns last 20 paid orders for this email
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const orders = await Order.find({
    customerEmail: email.toLowerCase(),
    paymentStatus: 'paid',
  })
    .sort({ createdAt: -1 })
    .limit(20);
  return res.json(orders);
}
