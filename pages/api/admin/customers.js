import dbConnect from '@/lib/dbConnect';
import Customer from '@/lib/models/Customer';
import Order from '@/lib/models/Order';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();

  const { email } = req.query;

  // Single customer detail
  if (email) {
    const customer = await Customer.findOne({ email }).lean();
    if (!customer) return res.status(404).json({ error: 'Not found' });
    const orders = await Order.find({ customerEmail: email }).sort({ createdAt: -1 }).lean();
    const totalSpent = orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + (o.totalAmount || 0), 0);
    return res.json({ customer, orders, totalSpent });
  }

  // All customers with aggregated stats
  const customers = await Customer.find({}).sort({ createdAt: -1 }).lean();
  const allOrders = await Order.find({ paymentStatus: 'paid' }).lean();

  const ordersByEmail = {};
  allOrders.forEach(o => {
    if (!o.customerEmail) return;
    if (!ordersByEmail[o.customerEmail]) ordersByEmail[o.customerEmail] = { count: 0, total: 0, lastOrder: null };
    ordersByEmail[o.customerEmail].count++;
    ordersByEmail[o.customerEmail].total += o.totalAmount || 0;
    const d = new Date(o.createdAt);
    if (!ordersByEmail[o.customerEmail].lastOrder || d > ordersByEmail[o.customerEmail].lastOrder) {
      ordersByEmail[o.customerEmail].lastOrder = d;
    }
  });

  const result = customers.map(c => ({
    ...c,
    orderCount: ordersByEmail[c.email]?.count || 0,
    totalSpent: ordersByEmail[c.email]?.total || 0,
    lastOrder: ordersByEmail[c.email]?.lastOrder || null,
  }));

  return res.json(result);
}
