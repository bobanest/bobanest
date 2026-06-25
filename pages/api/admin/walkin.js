import dbConnect from '@/lib/dbConnect';
import WalkInLog from '@/lib/models/WalkInLog';
import { deductInventoryForItems } from '@/lib/deductInventory';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const { source, limit } = req.query;
    let query = {};
    if (source) query.source = source;

    const logs = await WalkInLog.find(query)
      .sort({ date: -1 })
      .limit(limit ? parseInt(limit) : 0)
      .lean();
    return res.json(logs);
  }

  if (req.method === 'POST') {
    const { date, items, note, grossSales, netSales, discounts, source } = req.body;
    if (!date || !items?.length) {
      return res.status(400).json({ error: 'date and items required' });
    }

    const logDate = new Date(date);
    // Normalize items: CSV imports use `productName`, online orders use `name`
    const normalizedItems = items.map(i => ({ ...i, name: i.name || i.productName }));

    let deductions = 0;
    try {
      const results = await deductInventoryForItems(normalizedItems, {
        source: source === 'csv_import' ? 'walkin' : 'walkin',
        sourceRef: note || '',
        date: logDate,
      });
      deductions = results.length;
    } catch (e) {
      console.error('Walk-in inventory deduction error:', e.message);
    }

    const log = await WalkInLog.create({
      date: logDate,
      items,
      note: note || '',
      inventoryDeducted: deductions > 0,
      source: source || 'manual',
      grossSales: parseFloat(grossSales) || 0,
      netSales: parseFloat(netSales) || 0,
      discounts: parseFloat(discounts) || 0,
    });
    return res.json({ ...log.toObject(), deductions });
  }

  if (req.method === 'PUT') {
    // Update revenue fields only — does NOT re-deduct inventory
    const { id, grossSales, netSales, discounts } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const log = await WalkInLog.findByIdAndUpdate(
      id,
      { $set: { grossSales: parseFloat(grossSales) || 0, netSales: parseFloat(netSales) || 0, discounts: parseFloat(discounts) || 0 } },
      { new: true }
    );
    return res.json(log);
  }

  // PATCH — re-run inventory deduction for an existing log (without re-importing)
  if (req.method === 'PATCH') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const log = await WalkInLog.findById(id).lean();
    if (!log) return res.status(404).json({ error: 'log not found' });

    const normalizedItems = log.items.map(i => ({ ...i, name: i.productName }));
    let deductions = 0;
    try {
      const results = await deductInventoryForItems(normalizedItems, {
        source: 'walkin',
        sourceRef: log.note || '',
        date: log.date,
      });
      deductions = results.length;
    } catch (e) {
      console.error('Walk-in deduction error (PATCH):', e.message);
      return res.status(500).json({ error: e.message });
    }
    if (deductions > 0) {
      await WalkInLog.findByIdAndUpdate(id, { $set: { inventoryDeducted: true } });
    }
    return res.json({ success: true, deductions });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    await WalkInLog.findByIdAndDelete(id);
    return res.json({ success: true });
  }

  return res.status(405).end();
}
