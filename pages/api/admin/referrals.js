import dbConnect from '@/lib/dbConnect';
import Customer from '@/lib/models/Customer';
import Order from '@/lib/models/Order';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  await dbConnect();

  const [referrers, referred, orders] = await Promise.all([
    Customer.find({ referralCode: { $ne: null } })
      .select('email name referralCode points createdAt')
      .lean(),
    Customer.find({ referredBy: { $ne: null } })
      .select('email name referredBy createdAt')
      .lean(),
    Order.find({ referralCode: { $ne: null }, paymentStatus: 'paid' })
      .select('referralCode totalAmount createdAt')
      .lean(),
  ]);

  // Map referralCode -> referred customers
  const referralMap = {};
  referred.forEach(c => {
    if (!referralMap[c.referredBy]) referralMap[c.referredBy] = [];
    referralMap[c.referredBy].push(c);
  });

  // Map referralCode -> order stats
  const orderStats = {};
  orders.forEach(o => {
    if (!orderStats[o.referralCode]) orderStats[o.referralCode] = { count: 0, total: 0 };
    orderStats[o.referralCode].count++;
    orderStats[o.referralCode].total += o.totalAmount;
  });

  const result = referrers.map(r => ({
    ...r,
    referredCustomers: referralMap[r.referralCode] || [],
    referralCount: (referralMap[r.referralCode] || []).length,
    ordersFromReferrals: (orderStats[r.referralCode] || {}).count || 0,
    revenueFromReferrals: (orderStats[r.referralCode] || {}).total || 0,
  })).sort((a, b) => b.referralCount - a.referralCount);

  return res.json({
    referrers: result,
    totalReferred: referred.length,
    totalReferrers: referrers.length,
    totalReferralOrders: orders.length,
    totalReferralRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
  });
}
