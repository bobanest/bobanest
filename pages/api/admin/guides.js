import dbConnect from '@/lib/dbConnect';
import Guide from '@/lib/models/Guide';
import Location from '@/lib/models/Location';
import { SHARED_GUIDES, storeGuides } from '@/lib/guideSeed';

// Admin only.
export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    return res.json(await Guide.find().sort({ order: 1, title: 1 }).lean());
  }

  if (req.method === 'POST') {
    if (req.body?.action === 'seed') {
      if (await Guide.estimatedDocumentCount()) return res.status(409).json({ error: 'Guides already exist.' });
      const locs = await Location.find({ isActive: true }).sort({ name: 1 }).lean();
      const docs = [...SHARED_GUIDES, ...locs.flatMap(storeGuides)];
      await Guide.insertMany(docs);
      return res.json({ created: docs.length });
    }

    const { _id, title, category, order, locations, body } = req.body || {};
    if (!String(title || '').trim()) return res.status(400).json({ error: 'Title is required.' });
    const fields = {
      title: String(title).trim().slice(0, 140),
      category: String(category || 'General').trim().slice(0, 60),
      order: Number.isFinite(Number(order)) ? Number(order) : 100,
      locations: Array.isArray(locations) ? locations.map(String) : [],
      body: String(body || '').slice(0, 20000),
      updatedAt: new Date(),
    };
    const doc = _id ? await Guide.findByIdAndUpdate(_id, { $set: fields }, { new: true }) : await Guide.create(fields);
    return res.json(doc);
  }

  if (req.method === 'DELETE') {
    await Guide.deleteOne({ _id: req.query.id });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
