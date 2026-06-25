import dbConnect from '@/lib/dbConnect';
import PromoCode from '@/lib/models/PromoCode';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const codes = await PromoCode.find({}).sort({ createdAt: -1 });
    return res.json(codes);
  }

  if (req.method === 'POST') {
    const { code, description, type, value, minOrderAmount, maxUses, expiresAt } = req.body;
    if (!code || !type || value === undefined) {
      return res.status(400).json({ error: 'code, type, and value are required' });
    }
    try {
      const promo = await PromoCode.create({
        code: code.toUpperCase().trim(),
        description: description || '',
        type,
        value: Number(value),
        minOrderAmount: Number(minOrderAmount) || 0,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      });
      return res.status(201).json(promo);
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ error: 'Code already exists' });
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    if (updates.expiresAt) updates.expiresAt = new Date(updates.expiresAt);
    if (updates.maxUses !== undefined) updates.maxUses = updates.maxUses ? Number(updates.maxUses) : null;
    const updated = await PromoCode.findByIdAndUpdate(id, updates, { new: true });
    return res.json(updated);
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    await PromoCode.findByIdAndDelete(id);
    return res.json({ success: true });
  }

  res.status(405).end();
}
