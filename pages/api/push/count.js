import dbConnect from '@/lib/dbConnect';
import PushSubscription from '@/lib/models/PushSubscription';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const count = await PushSubscription.countDocuments({});
  return res.json({ count });
}
