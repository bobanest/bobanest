import dbConnect from '@/lib/dbConnect';
import InventoryItem from '@/lib/models/InventoryItem';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const { search } = req.query;
    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
    const items = await InventoryItem.find(filter).sort({ category: 1, name: 1 }).lean();
    return res.json(items);
  }

  if (req.method === 'POST') {
    const { name, unit, stockCount, lowStockThreshold, category, notes, costPerUnit, servingsPerUnit, usageUnit, mlPerUnit } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const item = await InventoryItem.create({
      name,
      unit: unit || 'unit',
      stockCount: parseFloat(stockCount) || 0,
      lowStockThreshold: parseFloat(lowStockThreshold) || 5,
      category: category || 'other',
      notes: notes || '',
      costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null,
      servingsPerUnit: servingsPerUnit ? parseFloat(servingsPerUnit) : null,
      usageUnit: usageUnit || '',
      mlPerUnit: mlPerUnit ? parseFloat(mlPerUnit) : null,
    });
    return res.status(201).json(item);
  }

  if (req.method === 'PUT') {
    const { id, name, unit, stockCount, lowStockThreshold, category, notes, costPerUnit, servingsPerUnit, usageUnit, mlPerUnit, adjust } = req.body;
    const update = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (unit !== undefined) update.unit = unit;
    if (lowStockThreshold !== undefined) update.lowStockThreshold = parseFloat(lowStockThreshold);
    if (category !== undefined) update.category = category;
    if (notes !== undefined) update.notes = notes;
    if (costPerUnit !== undefined) update.costPerUnit = costPerUnit ? parseFloat(costPerUnit) : null;
    if (servingsPerUnit !== undefined) update.servingsPerUnit = servingsPerUnit ? parseFloat(servingsPerUnit) : null;
    if (usageUnit !== undefined) update.usageUnit = usageUnit || '';
    if (mlPerUnit !== undefined) update.mlPerUnit = mlPerUnit ? parseFloat(mlPerUnit) : null;

    let item;
    if (adjust !== undefined) {
      item = await InventoryItem.findByIdAndUpdate(
        id,
        { $inc: { stockCount: adjust }, $set: update },
        { new: true }
      );
    } else {
      if (stockCount !== undefined) update.stockCount = parseFloat(stockCount);
      item = await InventoryItem.findByIdAndUpdate(id, update, { new: true });
    }
    return res.json(item);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    await InventoryItem.findByIdAndDelete(id);
    return res.json({ success: true });
  }

  return res.status(405).end();
}
