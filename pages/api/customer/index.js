import dbConnect from '@/lib/dbConnect';
import Customer from '@/lib/models/Customer';

// GET /api/customer?email=x  -> find or return 404
// POST /api/customer          -> upsert (create if not exists)
export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const customer = await Customer.findOne({ email: email.toLowerCase() });
    if (!customer) return res.status(404).json({ error: 'Not found' });
    return res.json(customer);
  }

  if (req.method === 'POST') {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const customer = await Customer.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $setOnInsert: { name: name || '', points: 0, favoriteOrders: [] } },
      { upsert: true, new: true }
    );
    return res.status(200).json(customer);
  }

  res.status(405).end();
}
