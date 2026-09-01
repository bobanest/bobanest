import dbConnect from '@/lib/dbConnect';
import PosSetting from '@/lib/models/PosSetting';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const settings = await PosSetting.find({}).lean();
      const payload = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
      return res.status(200).json(payload);
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Unable to load POS settings' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { key, value } = req.body || {};
      if (!key || !String(key).trim()) {
        return res.status(400).json({ error: 'Setting key is required' });
      }

      const updated = await PosSetting.findOneAndUpdate(
        { key: String(key).trim() },
        { $set: { value, updatedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();

      return res.status(200).json({ key: updated.key, value: updated.value });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Unable to save POS setting' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
