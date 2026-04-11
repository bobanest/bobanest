// pages/api/webhook/daily-post.js
import dbConnect from '@/lib/dbConnect';
import DailyPost from '@/lib/models/DailyPost';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { token, title, description, imageUrl } = req.body;

  // Verify webhook secret token
  if (token !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook token' });
  }

  if (!title || !description || !imageUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newPost = await DailyPost.create({
    title,
    description,
    imageUrl,
  });

  res.status(201).json({ success: true, post: newPost });
}