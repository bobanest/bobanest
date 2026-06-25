import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';

export default async function handler(req, res) {
  await dbConnect();
  const { tracking } = req.query;
  const order = await Order.findOne({ trackingNumber: tracking });
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
}