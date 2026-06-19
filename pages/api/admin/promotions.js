import dbConnect from '@/lib/dbConnect';
import Promotion from '@/lib/models/Promotion';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const query = {};
  if (req.query.active === 'true') {
    query.isActive = true;
  }

  try {
    await dbConnect();
    const promotions = await Promotion.find(query)
      .populate('applicableProducts')
      .sort({ startDate: -1 });

    return res.json(promotions);
  } catch (error) {
    return res.json([]);
  }
}
