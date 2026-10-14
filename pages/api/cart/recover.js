import dbConnect from '@/lib/dbConnect';
import AbandonedCart from '@/lib/models/AbandonedCart';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = String(req.query?.token || '');
  if (!/^[a-f0-9]{48}$/.test(token)) return res.status(404).json({ error: 'Cart not found' });

  await dbConnect();
  const cart = await AbandonedCart.findOne({ token, status: { $in: ['active', 'closed'] } }).lean();
  if (!cart || !cart.items?.length) return res.status(404).json({ error: 'Cart not found' });

  return res.status(200).json({
    email: cart.email,
    pickupLocation: cart.pickupLocation,
    items: cart.items,
  });
}
