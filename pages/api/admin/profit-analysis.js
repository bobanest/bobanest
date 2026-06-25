import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import WalkInLog from '@/lib/models/WalkInLog';
import Expense from '@/lib/models/Expense';
import Recipe from '@/lib/models/Recipe';
import InventoryItem from '@/lib/models/InventoryItem';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();

  const { month } = req.query; // e.g. "2026-04"
  let year, mon;
  if (month) {
    [year, mon] = month.split('-').map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    mon = now.getMonth() + 1;
  }

  const dateStart = new Date(year, mon - 1, 1);
  const dateEnd = new Date(year, mon, 1);
  const dateFilter = { $gte: dateStart, $lt: dateEnd };

  const [orders, walkIns, expenses, recipes, inventoryItems] = await Promise.all([
    Order.find({ createdAt: dateFilter, paymentStatus: 'paid' }).lean(),
    WalkInLog.find({ date: dateFilter }).lean(),
    Expense.find({ date: dateFilter }).lean(),
    Recipe.find({}).lean(),
    InventoryItem.find({}).lean(),
  ]);

  // Inventory cost lookup: name (lowercase) -> costPerUnit
  const invMap = {};
  for (const item of inventoryItems) {
    invMap[item.name.toLowerCase()] = item.costPerUnit ?? null;
  }

  // Recipe lookup: `productName|size` -> recipe
  const recipeMap = {};
  for (const r of recipes) {
    recipeMap[`${r.productName.toLowerCase()}|${r.size || 'any'}`] = r;
  }

  function getRecipeCost(productName) {
    const key = `${String(productName).toLowerCase()}|standard`;
    const fallback = `${String(productName).toLowerCase()}|any`;
    const recipe = recipeMap[key] || recipeMap[fallback] || null;
    if (!recipe) return null;
    let cost = 0;
    for (const ing of recipe.ingredients) {
      const cpu = invMap[ing.name.toLowerCase()];
      if (cpu == null) return null;
      cost += cpu * ing.quantity;
    }
    return cost;
  }

  // Revenue
  const onlineRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const walkInRevenue = walkIns.reduce((s, w) => s + (w.grossSales || w.netSales || 0), 0);
  const totalRevenue = onlineRevenue + walkInRevenue;

  // COGS + per-product stats
  let trackedCOGS = 0;
  const productStats = {};

  function addProductStat(name, qty, itemRevenue, cost) {
    if (!productStats[name]) productStats[name] = { unitsSold: 0, revenue: 0, cogs: 0, cogsTracked: true };
    productStats[name].unitsSold += qty;
    productStats[name].revenue += itemRevenue;
    if (cost != null) {
      trackedCOGS += cost * qty;
      productStats[name].cogs += cost * qty;
    } else {
      productStats[name].cogsTracked = false;
    }
  }

  for (const order of orders) {
    for (const item of order.items) {
      const qty = item.quantity || 1;
      const cost = getRecipeCost(item.name);
      addProductStat(item.name, qty, (item.price || 0) * qty, cost);
    }
  }

  for (const log of walkIns) {
    const totalQty = log.items.reduce((s, i) => s + (i.quantity || 1), 0);
    for (const item of log.items) {
      const qty = item.quantity || 1;
      const cost = getRecipeCost(item.productName);
      // Distribute walk-in revenue proportionally by quantity
      const itemRevenue = totalQty > 0 ? ((log.grossSales || log.netSales || 0) * qty) / totalQty : 0;
      addProductStat(item.productName, qty, itemRevenue, cost);
    }
  }

  // Expenses
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const expenseByCategory = {};
  for (const e of expenses) {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  }

  // Summary
  const grossProfit = totalRevenue - trackedCOGS;
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : null;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : null;

  // Daily breakdown
  const dailyMap = {};
  function getDay(d) { return new Date(d).toISOString().slice(0, 10); }
  function ensureDay(d) {
    if (!dailyMap[d]) dailyMap[d] = { date: d, revenue: 0, cogs: 0, expenses: 0 };
  }

  for (const order of orders) {
    const d = getDay(order.createdAt);
    ensureDay(d);
    dailyMap[d].revenue += order.totalAmount || 0;
    for (const item of order.items) {
      const cost = getRecipeCost(item.name);
      if (cost != null) dailyMap[d].cogs += cost * (item.quantity || 1);
    }
  }

  for (const log of walkIns) {
    const d = getDay(log.date);
    ensureDay(d);
    dailyMap[d].revenue += log.grossSales || log.netSales || 0;
    for (const item of log.items) {
      const cost = getRecipeCost(item.productName);
      if (cost != null) dailyMap[d].cogs += cost * (item.quantity || 1);
    }
  }

  for (const e of expenses) {
    const d = getDay(e.date);
    ensureDay(d);
    dailyMap[d].expenses += e.amount;
  }

  const daily = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, profit: d.revenue - d.cogs - d.expenses }));

  // Top products by gross profit
  const topProducts = Object.entries(productStats)
    .map(([name, s]) => ({ name, ...s, grossProfit: s.revenue - s.cogs }))
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .slice(0, 15);

  return res.json({
    summary: {
      onlineRevenue,
      walkInRevenue,
      totalRevenue,
      trackedCOGS,
      grossProfit,
      grossMargin,
      totalExpenses,
      netProfit,
      netMargin,
      ordersCount: orders.length,
      walkInsCount: walkIns.length,
    },
    expenseByCategory,
    daily,
    topProducts,
  });
}
