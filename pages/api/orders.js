import fs from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';

const filePath = path.join(process.cwd(), 'data', 'local-orders.json');

async function readFallback() {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeFallback(data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();
      const orders = await Order.find({}).sort({ createdAt: -1 }).lean();
      return res.json(orders);
    } catch {
      return res.json(await readFallback());
    }
  }

  if (req.method === 'PUT') {
    const { id, status } = req.body || {};

    try {
      await dbConnect();
      const updated = await Order.findByIdAndUpdate(id, { status }, { new: true });
      return res.json(updated);
    } catch {
      const orders = await readFallback();
      const next = orders.map((order) => (order._id === id ? { ...order, status } : order));
      await writeFallback(next);
      return res.json({ success: true });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}