import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing order id' });
  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.status(200).json(order);
}