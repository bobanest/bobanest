// POST /api/loyalty/verify-session
// Called on page load when a valid localStorage session exists.
// Does NOT require a verification code — trust is established by the stored session.
// Returns customer data + recent orders.

import dbConnect from '@/lib/dbConnect';
import Customer from '@/lib/models/Customer';
import Order from '@/lib/models/Order';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    await dbConnect();
    const emailLower = email.toLowerCase().trim();

    const customer = await Customer.findOne({ email: emailLower }).lean();
    if (!customer) return res.status(404).json({ error: 'Not found' });

    const orders = await Order.find({ customerEmail: emailLower, paymentStatus: 'paid' })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      customer: {
        email: customer.email,
        name: customer.name,
        points: customer.points,
        favoriteOrders: customer.favoriteOrders,
      },
      orders,
    });
  } catch (err) {
    console.error('verify-session error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
