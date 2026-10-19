import dbConnect from '@/lib/dbConnect';
import TvScreen from '@/lib/models/TvScreen';

const clamp = (n, min, max, fallback) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
};

const isHttpUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u) && u.length < 1000;

export default async function handler(req, res) {
  try {
    await dbConnect();
    const location = String(req.query.location || req.body?.location || '').toLowerCase().trim();
    if (!location) return res.status(400).json({ error: 'location is required' });

    if (req.method === 'GET') {
      const doc = await TvScreen.findOne({ location }).lean();
      return res.status(200).json(
        doc || { location, defaultDuration: 10, transition: 'fade', fit: 'contain', slides: [] }
      );
    }

    if (req.method === 'PUT') {
      const { defaultDuration, transition, fit, slides } = req.body || {};
      if (!Array.isArray(slides) || slides.length > 100) {
        return res.status(400).json({ error: 'slides must be an array (max 100)' });
      }
      const cleanSlides = [];
      for (const s of slides) {
        if (!isHttpUrl(s?.imageUrl)) return res.status(400).json({ error: 'Invalid image URL' });
        cleanSlides.push({
          imageUrl: s.imageUrl,
          durationSec: s.durationSec ? clamp(s.durationSec, 2, 600, 0) : 0,
          isActive: s.isActive !== false,
        });
      }
      const doc = await TvScreen.findOneAndUpdate(
        { location },
        {
          $set: {
            defaultDuration: clamp(defaultDuration, 2, 600, 10),
            transition: ['fade', 'slide', 'none'].includes(transition) ? transition : 'fade',
            fit: fit === 'cover' ? 'cover' : 'contain',
            slides: cleanSlides,
            updatedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      return res.status(200).json(doc);
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end();
  } catch (err) {
    console.error('TV admin error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
