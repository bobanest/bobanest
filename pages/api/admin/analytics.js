import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import WalkInLog from '@/lib/models/WalkInLog';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();

  const days = parseInt(req.query.range) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [paidOrders, allPaidOrders, walkInLogs, allWalkInLogs] = await Promise.all([
    Order.find({ paymentStatus: 'paid', createdAt: { $gte: since } }).lean(),
    Order.find({ paymentStatus: 'paid' }).lean(),
    WalkInLog.find({ date: { $gte: since } }).lean(),
    WalkInLog.find({}).lean(),
  ]);

  // Totals (online orders)
  const onlineRevenue = paidOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const onlineOrders = paidOrders.length;
  const allTimeOnlineRevenue = allPaidOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  // Walk-in revenue (from CSV imports with netSales stored)
  const walkInRevenue = walkInLogs.reduce((s, w) => s + (w.netSales || 0), 0);
  const allTimeWalkInRevenue = allWalkInLogs.reduce((s, w) => s + (w.netSales || 0), 0);

  const totalRevenue = onlineRevenue + walkInRevenue;
  const totalOrders = onlineOrders + walkInLogs.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const allTimeRevenue = allTimeOnlineRevenue + allTimeWalkInRevenue;

  // Revenue by day (merge online + walk-in)
  const dayMap = {};
  paidOrders.forEach(o => {
    const d = new Date(o.createdAt).toISOString().slice(0, 10);
    if (!dayMap[d]) dayMap[d] = { date: d, revenue: 0, orders: 0, walkInRevenue: 0 };
    dayMap[d].revenue += o.totalAmount || 0;
    dayMap[d].orders++;
  });
  walkInLogs.forEach(w => {
    const d = new Date(w.date).toISOString().slice(0, 10);
    if (!dayMap[d]) dayMap[d] = { date: d, revenue: 0, orders: 0, walkInRevenue: 0 };
    dayMap[d].walkInRevenue += w.netSales || 0;
    dayMap[d].revenue += w.netSales || 0;
  });
  const revenueByDay = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

  // Top products (online + walk-in items)
  const productMap = {};
  paidOrders.forEach(o => {
    (o.items || []).forEach(item => {
      if (!productMap[item.name]) productMap[item.name] = { name: item.name, quantity: 0, revenue: 0 };
      productMap[item.name].quantity += item.quantity || 1;
      productMap[item.name].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });
  walkInLogs.forEach(w => {
    const logItems = w.items || [];
    const totalQty = logItems.reduce((s, i) => s + (i.quantity || 1), 0);
    const logRevenue = w.netSales || 0;
    logItems.forEach(item => {
      if (!productMap[item.productName]) productMap[item.productName] = { name: item.productName, quantity: 0, revenue: 0 };
      productMap[item.productName].quantity += item.quantity || 1;
      // Distribute revenue proportionally by quantity
      productMap[item.productName].revenue += totalQty > 0 ? (logRevenue * ((item.quantity || 1) / totalQty)) : 0;
    });
  });
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Orders by status (all time)
  const allOrders = await Order.find({}).lean();
  const statusMap = {};
  allOrders.forEach(o => {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1;
  });

  // Today's revenue
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayOnlineOrders = allPaidOrders.filter(o => new Date(o.createdAt) >= todayStart);
  const todayOnlineRevenue = todayOnlineOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const todayWalkIn = allWalkInLogs.filter(w => new Date(w.date) >= todayStart);
  const todayWalkInRevenue = todayWalkIn.reduce((s, w) => s + (w.netSales || 0), 0);
  const todayRevenue = todayOnlineRevenue + todayWalkInRevenue;

  // This month
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthOnlineOrders = allPaidOrders.filter(o => new Date(o.createdAt) >= monthStart);
  const monthOnlineRevenue = monthOnlineOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const monthWalkIn = allWalkInLogs.filter(w => new Date(w.date) >= monthStart);
  const monthWalkInRevenue = monthWalkIn.reduce((s, w) => s + (w.netSales || 0), 0);
  const monthRevenue = monthOnlineRevenue + monthWalkInRevenue;
  const monthOrders = monthOnlineOrders.length + monthWalkIn.length;

  return res.json({
    totalRevenue,
    totalOrders,
    avgOrderValue,
    allTimeRevenue,
    todayRevenue,
    todayOrders: todayOnlineOrders.length + todayWalkIn.length,
    monthRevenue,
    monthOrders,
    revenueByDay,
    topProducts,
    ordersByStatus: statusMap,
    // Breakdown for transparency
    onlineRevenue,
    walkInRevenue,
  });
}
