import dbConnect from '@/lib/dbConnect';
import StoreHours from '@/lib/models/StoreHours';
import { buildSlots } from '@/lib/pickupSlots';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    await dbConnect();
    const doc = await StoreHours.findOne({}).lean();
    const timezone = doc?.timezone || 'America/New_York';
    const location = String(req.query.location || '').trim();
    const slots = await buildSlots(doc, location);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ timezone, slots });
  } catch (error) {
    console.error('Pickup slots error:', error);
    return res.status(500).json({ error: 'Unable to load pickup times' });
  }
}
