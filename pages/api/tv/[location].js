import dbConnect from '@/lib/dbConnect';
import TvScreen from '@/lib/models/TvScreen';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    await dbConnect();
    const location = String(req.query.location || '').toLowerCase().trim();
    const doc = await TvScreen.findOne({ location }).lean();
    res.setHeader('Cache-Control', 'no-store');
    if (!doc) {
      return res.status(200).json({ defaultDuration: 10, transition: 'fade', fit: 'contain', slides: [], version: 0 });
    }
    return res.status(200).json({
      defaultDuration: doc.defaultDuration,
      transition: doc.transition,
      fit: doc.fit,
      slides: (doc.slides || [])
        .filter((s) => s.isActive !== false)
        .map((s) => ({ imageUrl: s.imageUrl, durationSec: s.durationSec || 0 })),
      version: new Date(doc.updatedAt).getTime(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to load menu' });
  }
}
