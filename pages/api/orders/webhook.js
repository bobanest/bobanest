// pages/api/orders/webhook.js
import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    // For catering requests or order webhook
    // In production, verify Stripe webhook signature
    const order = await Order.create(req.body);
    res.status(200).json(order);
  } else if (req.method === 'GET') {
    const orders = await Order.find({});
    res.status(200).json(orders);
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}