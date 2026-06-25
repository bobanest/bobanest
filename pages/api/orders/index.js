import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import { deductInventoryForItems } from '@/lib/deductInventory';

export default async function handler(req, res) {
  await dbConnect();
  if (req.method === 'GET') {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } else if (req.method === 'PUT') {
    const { id, status } = req.body;
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    // Auto-deduct inventory when order is marked completed
    if (status === 'completed' && order) {
      try {
        await deductInventoryForItems(
          order.items.map(i => ({ name: i.name, quantity: i.quantity }))
        );
      } catch (e) {
        console.error('Order inventory deduction error:', e.message);
      }
    }
    res.json({ success: true });
  } else {
    res.status(405).end();
  }
}