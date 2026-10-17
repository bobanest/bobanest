import { priceCart, PricingError } from '@/lib/qrOrder';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { items, pickupLocation } = req.body || {};
    const priced = await priceCart({ items, pickupLocation });
    return res.status(200).json({ amount: priced.amount, discount: priced.discount, location: priced.location });
  } catch (error) {
    if (error instanceof PricingError) return res.status(400).json({ error: error.message });
    console.error('QR quote error:', error);
    return res.status(500).json({ error: 'Unable to price this order.' });
  }
}
