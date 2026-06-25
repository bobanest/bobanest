import dbConnect from '@/lib/dbConnect';
import StoreHours from '@/lib/models/StoreHours';
import { getStoreStatusAt } from '@/lib/storeHoursHelper';

const DEFAULT_WEEKLY = Array.from({ length: 7 }, (_, i) => ({
  day: i, isOpen: true, openTime: '10:00', closeTime: '21:00',
}));

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();

  let doc = await StoreHours.findOne({}).lean();
  if (!doc) {
    doc = { weeklyHours: DEFAULT_WEEKLY, specialHours: [], timezone: 'America/New_York' };
  }

  const status = getStoreStatusAt(doc, new Date());

  // Cache for 60 seconds — fine for public display
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  return res.json({
    isOpen: status.isOpen,
    reason: status.reason,
    todayOpen: status.todayOpen,
    todayClose: status.todayClose,
    weeklyHours: doc.weeklyHours,
    specialHours: doc.specialHours,
    timezone: doc.timezone,
  });
}
