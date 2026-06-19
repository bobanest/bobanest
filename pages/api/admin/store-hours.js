import fs from 'fs/promises';
import path from 'path';
import dbConnect from '@/lib/dbConnect';
import StoreHours from '@/lib/models/StoreHours';

const DEFAULT_WEEKLY = Array.from({ length: 7 }, (_, day) => ({
  day,
  isOpen: true,
  openTime: '10:00',
  closeTime: '21:00',
}));

const FALLBACK_DATA = {
  weeklyHours: DEFAULT_WEEKLY,
  specialHours: [],
  timezone: 'America/New_York',
};

const filePath = path.join(process.cwd(), 'data', 'local-store-hours.json');

async function readFallback() {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return FALLBACK_DATA;
  }
}

async function writeFallback(data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();
      let doc = await StoreHours.findOne({}).lean();
      if (!doc) {
        doc = FALLBACK_DATA;
      }
      return res.json(doc);
    } catch {
      return res.json(await readFallback());
    }
  }

  if (req.method === 'PUT') {
    const payload = {
      weeklyHours: req.body?.weeklyHours || DEFAULT_WEEKLY,
      specialHours: req.body?.specialHours || [],
      timezone: req.body?.timezone || 'America/New_York',
      updatedAt: new Date().toISOString(),
    };

    try {
      await dbConnect();
      const doc = await StoreHours.findOneAndUpdate({}, payload, { new: true, upsert: true });
      return res.json(doc);
    } catch {
      await writeFallback(payload);
      return res.json({ success: true });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}