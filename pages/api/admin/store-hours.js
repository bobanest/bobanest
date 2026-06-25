import dbConnect from '@/lib/dbConnect';
import StoreHours from '@/lib/models/StoreHours';

const DEFAULT_WEEKLY = Array.from({ length: 7 }, (_, i) => ({
  day: i,
  isOpen: true,
  openTime: '10:00',
  closeTime: '21:00',
}));

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    let doc = await StoreHours.findOne({}).lean();
    if (!doc) {
      doc = { weeklyHours: DEFAULT_WEEKLY, specialHours: [], timezone: 'America/New_York' };
    }
    return res.json(doc);
  }

  if (req.method === 'PUT') {
    const { weeklyHours, specialHours, timezone } = req.body;
    const doc = await StoreHours.findOneAndUpdate(
      {},
      {
        weeklyHours: weeklyHours || DEFAULT_WEEKLY,
        specialHours: specialHours || [],
        timezone: timezone || 'America/New_York',
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    return res.json(doc);
  }

  return res.status(405).end();
}
