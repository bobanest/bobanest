import dbConnect from '@/lib/dbConnect';
import Expense from '@/lib/models/Expense';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const { month } = req.query; // e.g. "2026-04"
    const filter = {};
    if (month) {
      const [y, m] = month.split('-').map(Number);
      filter.date = {
        $gte: new Date(y, m - 1, 1),
        $lt: new Date(y, m, 1),
      };
    }
    const expenses = await Expense.find(filter).sort({ date: -1 }).lean();
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    return res.json({ expenses, total });
  }

  if (req.method === 'POST') {
    const { description, amount, category, date, notes } = req.body;
    if (!description || !amount || !date) return res.status(400).json({ error: 'description, amount, date required' });
    const expense = await Expense.create({ description, amount: parseFloat(amount), category, date: new Date(date), notes });
    return res.status(201).json(expense);
  }

  if (req.method === 'PUT') {
    const { id, ...update } = req.body;
    if (update.amount) update.amount = parseFloat(update.amount);
    if (update.date) update.date = new Date(update.date);
    const expense = await Expense.findByIdAndUpdate(id, update, { new: true });
    return res.json(expense);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    await Expense.findByIdAndDelete(id);
    return res.json({ success: true });
  }

  return res.status(405).end();
}
