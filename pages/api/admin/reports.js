import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import WalkInLog from '@/lib/models/WalkInLog';
import Visitor from '@/lib/models/Visitor';

function toDateOnlyString(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function parseDateRange(query) {
  const today = new Date();
  const defaultTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setDate(defaultFrom.getDate() - 29);

  const from = query.from ? new Date(`${query.from}T00:00:00`) : defaultFrom;
  const to = query.to ? new Date(`${query.to}T00:00:00`) : defaultTo;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error('Invalid date range');
  }
  if (from > to) {
    throw new Error('From date must be before or equal to To date');
  }

  const toExclusive = new Date(to);
  toExclusive.setDate(toExclusive.getDate() + 1);

  return { from, to, toExclusive };
}

function includesFilter(name, filter) {
  if (!filter) return true;
  return String(name || '').toLowerCase().includes(filter);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    await dbConnect();
    const { from, to, toExclusive } = parseDateRange(req.query);
    const productFilter = String(req.query.product || '').trim().toLowerCase();

    const [orders, walkins, visitors] = await Promise.all([
      Order.find({ paymentStatus: 'paid', createdAt: { $gte: from, $lt: toExclusive } }).lean(),
      WalkInLog.find({ date: { $gte: from, $lt: toExclusive } }).lean(),
      Visitor.find({ visitedAt: { $gte: from, $lt: toExclusive } }).lean(),
    ]);

    const allProducts = new Map();
    const filteredProducts = new Map();
    const topCitiesMap = new Map();
    const dailyDrinksMap = new Map();
    const uniqueCustomers = new Set();
    let totalDrinksSold = 0;
    let onlineOrders = 0;
    let walkInTickets = 0;
    let onlineRevenue = 0;
    let walkInRevenue = 0;
    let pickupOrders = 0;
    let deliveryOrders = 0;

    const addItem = ({ name, quantity, revenue, dateKey, filterOnly = false }) => {
      if (!filterOnly) {
        totalDrinksSold += quantity;
        const currentDaily = dailyDrinksMap.get(dateKey) || 0;
        dailyDrinksMap.set(dateKey, currentDaily + quantity);
      }

      const allCurrent = allProducts.get(name) || { name, quantity: 0, revenue: 0 };
      allCurrent.quantity += quantity;
      allCurrent.revenue += revenue;
      allProducts.set(name, allCurrent);

      if (includesFilter(name, productFilter)) {
        const filteredCurrent = filteredProducts.get(name) || { name, quantity: 0, revenue: 0 };
        filteredCurrent.quantity += quantity;
        filteredCurrent.revenue += revenue;
        filteredProducts.set(name, filteredCurrent);
      }
    };

    for (const order of orders) {
      onlineOrders += 1;
      onlineRevenue += Number(order.totalAmount || 0);
      if (order.customerEmail) uniqueCustomers.add(String(order.customerEmail).toLowerCase());
      if (order.orderType === 'delivery') deliveryOrders += 1;
      else pickupOrders += 1;

      const dateKey = toDateOnlyString(order.createdAt);
      for (const item of order.items || []) {
        const quantity = Number(item.quantity || 1);
        const revenue = Number(item.price || 0) * quantity;
        addItem({ name: item.name || 'Unknown', quantity, revenue, dateKey });
      }
    }

    for (const log of walkins) {
      walkInTickets += 1;
      const netSales = Number(log.netSales || 0);
      walkInRevenue += netSales;
      const dateKey = toDateOnlyString(log.date || log.createdAt || new Date());
      const items = Array.isArray(log.items) ? log.items : [];
      const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

      for (const item of items) {
        const quantity = Number(item.quantity || 1);
        const revenue = totalQty > 0 ? (netSales * quantity) / totalQty : 0;
        addItem({ name: item.productName || 'Unknown', quantity, revenue, dateKey });
      }
    }

    for (const v of visitors) {
      const city = [v.city, v.country].filter(Boolean).join(', ') || 'Unknown';
      topCitiesMap.set(city, (topCitiesMap.get(city) || 0) + 1);
    }

    const rows = Array.from(filteredProducts.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
    const topProducts = Array.from(allProducts.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 10);
    const totalFilteredDrinks = rows.reduce((sum, row) => sum + row.quantity, 0);
    const totalFilteredRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const tickets = onlineOrders + walkInTickets;

    return res.json({
      filters: {
        from: toDateOnlyString(from),
        to: toDateOnlyString(to),
        product: productFilter,
      },
      drinksReport: {
        totalDrinksSold: totalFilteredDrinks,
        totalRevenue: totalFilteredRevenue,
        matchedProducts: rows.length,
        rows,
      },
      standardReports: {
        totalDrinksSold,
        totalRevenue: onlineRevenue + walkInRevenue,
        onlineRevenue,
        walkInRevenue,
        onlineOrders,
        walkInTickets,
        totalTickets: tickets,
        uniqueCustomers: uniqueCustomers.size,
        averageDrinksPerTicket: tickets > 0 ? totalDrinksSold / tickets : 0,
        orderTypeSplit: {
          pickup: pickupOrders,
          delivery: deliveryOrders,
        },
        topDrink: topProducts[0] || null,
        topProducts,
        dailyDrinks: Array.from(dailyDrinksMap.entries())
          .map(([date, quantity]) => ({ date, quantity }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        visitorsCount: visitors.length,
        topVisitorCities: Array.from(topCitiesMap.entries())
          .map(([city, visits]) => ({ city, visits }))
          .sort((a, b) => b.visits - a.visits)
          .slice(0, 10),
      },
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Failed to generate report' });
  }
}
