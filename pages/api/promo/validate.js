import dbConnect from '@/lib/dbConnect';
import PromoCode from '@/lib/models/PromoCode';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code, orderTotal } = req.body;
  if (!code) return res.status(400).json({ valid: false, error: 'Code required' });

  await dbConnect();
  const promo = await PromoCode.findOne({ code: code.toUpperCase().trim() });

  if (!promo) return res.json({ valid: false, error: 'Invalid promo code' });
  if (!promo.isActive) return res.json({ valid: false, error: 'This code is no longer active' });
  if (promo.expiresAt && new Date() > promo.expiresAt) return res.json({ valid: false, error: 'This code has expired' });
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return res.json({ valid: false, error: 'This code has reached its usage limit' });
  if ((orderTotal || 0) < promo.minOrderAmount) {
    return res.json({ valid: false, error: `Minimum order of $${promo.minOrderAmount.toFixed(2)} required` });
  }

  const rawDiscount = promo.type === 'percentage'
    ? (orderTotal || 0) * promo.value / 100
    : promo.value;
  const discount = Math.min(rawDiscount, orderTotal || rawDiscount);

  return res.json({
    valid: true,
    discount,
    type: promo.type,
    value: promo.value,
    description: promo.description,
    code: promo.code,
  });
}
