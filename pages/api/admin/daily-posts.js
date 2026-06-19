import dbConnect from '@/lib/dbConnect';
import DailyPost from '@/lib/models/DailyPost';

const fallbackPosts = [
  {
    _id: 'fallback-post-1',
    title: 'Brown Sugar Spotlight',
    description: 'Fresh brown sugar boba made in small batches throughout the day.',
    imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=900',
  },
  {
    _id: 'fallback-post-2',
    title: 'Fruit Tea Favorites',
    description: 'Mango, lychee, and strawberry teas are available for pickup today.',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=900',
  },
  {
    _id: 'fallback-post-3',
    title: 'Weekend Special',
    description: 'Try a creamy milk tea with tapioca pearls and a fresh pastry pairing.',
    imageUrl: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=900',
  },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await dbConnect();
    const posts = await DailyPost.find({}).sort({ date: -1 });
    return res.json(posts.length > 0 ? posts : fallbackPosts);
  } catch (error) {
    return res.json(fallbackPosts);
  }
}