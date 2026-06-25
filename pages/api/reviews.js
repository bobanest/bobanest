
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import * as yup from 'yup';

export default async function handler(req, res) {
  await dbConnect();
  if (req.method === 'GET') {
    const { productId } = req.query;
    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });
    res.json(reviews);
  } else if (req.method === 'POST') {
    // Yup validation schema for reviews
    const schema = yup.object({
      productId: yup.string().required(),
      rating: yup.number().min(1).max(5).required(),
      comment: yup.string().required(),
      name: yup.string().required(),
    });
    try {
      await schema.validate(req.body, { abortEarly: false });
      const { productId, rating, comment, name } = req.body;
      const review = await Review.create({ productId, rating, comment, customerName: name });
      res.status(201).json(review);
    } catch (err) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
  }
}