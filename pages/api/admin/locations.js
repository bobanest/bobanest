import dbConnect from '@/lib/dbConnect';
import Location from '@/lib/models/Location';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const locations = await Location.find({}).sort({ name: 1 }).lean();
      return res.status(200).json(locations);
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Unable to load locations' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, isActive = true, isComingSoon = false } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'Location name is required' });
      }

      const slug = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const location = await Location.findOneAndUpdate(
        { slug },
        { $set: { name: String(name).trim(), isActive, isComingSoon } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.status(201).json(location);
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Unable to create location' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const { name, isActive, isComingSoon } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Location id is required' });

      const updated = await Location.findByIdAndUpdate(
        id,
        {
          ...(name ? { name: String(name).trim() } : {}),
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
          ...(typeof isComingSoon === 'boolean' ? { isComingSoon } : {}),
        },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Location not found' });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Unable to update location' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Location id is required' });
      await Location.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Unable to delete location' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
