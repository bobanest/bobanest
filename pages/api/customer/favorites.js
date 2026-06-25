import dbConnect from '@/lib/dbConnect';
import Customer from '@/lib/models/Customer';

// GET    /api/customer/favorites?email=x  -> list favorites
// POST   /api/customer/favorites          -> { email, label, items } add favorite
// DELETE /api/customer/favorites          -> { email, favoriteId } remove favorite
export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const customer = await Customer.findOne({ email: email.toLowerCase() });
    if (!customer) return res.json([]);
    return res.json(customer.favoriteOrders || []);
  }

  if (req.method === 'POST') {
    const { email, label, items } = req.body;
    if (!email || !label || !items) return res.status(400).json({ error: 'email, label, and items required' });
    const customer = await Customer.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $push: { favoriteOrders: { label, items } } },
      { upsert: true, new: true }
    );
    return res.json(customer.favoriteOrders);
  }

  if (req.method === 'DELETE') {
    const { email, favoriteId } = req.body;
    if (!email || !favoriteId) return res.status(400).json({ error: 'email and favoriteId required' });
    const customer = await Customer.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $pull: { favoriteOrders: { _id: favoriteId } } },
      { new: true }
    );
    return res.json(customer?.favoriteOrders || []);
  }

  res.status(405).end();
}
