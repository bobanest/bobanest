import dbConnect from '@/lib/dbConnect';
import { saveCartSnapshot, normalizeEmail } from '@/lib/abandonedCart';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: 'Valid email required' });

  try {
    await dbConnect();
    await saveCartSnapshot({
      email,
      items: req.body?.items,
      pickupLocation: req.body?.pickupLocation,
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Cart capture error:', error);
    return res.status(500).json({ error: 'Unable to save cart' });
  }
}
