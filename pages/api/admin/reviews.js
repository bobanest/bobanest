import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .populate('productId', 'name');
    return res.json(reviews);
  }

  if (req.method === 'PUT') {
    const { id, verified } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const review = await Review.findByIdAndUpdate(id, { verified }, { new: true });
    return res.json(review);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    await Review.findByIdAndDelete(id);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
