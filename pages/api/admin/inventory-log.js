import dbConnect from '@/lib/dbConnect';
import InventoryLog from '@/lib/models/InventoryLog';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();

  const { from, to, source } = req.query;
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filter.date.$lte = toDate;
    }
  }
  if (source && source !== 'all') filter.source = source;

  const logs = await InventoryLog.find(filter).sort({ date: -1 }).lean();

  // Aggregate by ingredient across the date range
  const ingredientTotals = {};
  logs.forEach(log => {
    (log.ingredients || []).forEach(ing => {
      if (!ingredientTotals[ing.name]) ingredientTotals[ing.name] = { name: ing.name, total: 0, byDate: {} };
      ingredientTotals[ing.name].total += ing.amount;
      const d = new Date(log.date).toISOString().slice(0, 10);
      ingredientTotals[ing.name].byDate[d] = (ingredientTotals[ing.name].byDate[d] || 0) + ing.amount;
    });
  });

  return res.json({
    logs,
    ingredientSummary: Object.values(ingredientTotals).sort((a, b) => b.total - a.total),
  });
}
