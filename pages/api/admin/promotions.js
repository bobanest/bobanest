import dbConnect from '@/lib/dbConnect';
import Promotion from '@/lib/models/Promotion';

export default async function handler(req, res) {
  try {
    await dbConnect();

    if (req.method === 'GET') {
      const { active } = req.query;
      let query = {};
      if (active === 'true') {
        const now = new Date();
        query = {
          isActive: true,
          $or: [
            { startDate: { $lte: now } },
            { startDate: null },
          ],
          $or: [
            { endDate: { $gte: now } },
            { endDate: null },
          ],
        };
      }
      const promotions = await Promotion.find(query).populate('applicableProducts');
      return res.status(200).json(promotions);
    }

    if (req.method === 'POST') {
      try {
        const promo = await Promotion.create(req.body);
        return res.status(201).json(promo);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      try {
        const promo = await Promotion.findByIdAndUpdate(id, req.body, { new: true });
        return res.status(200).json(promo);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      await Promotion.findByIdAndDelete(id);
      return res.status(204).end();
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end();
  } catch (error) {
    console.error('Promotions API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}