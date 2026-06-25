import dbConnect from '@/lib/dbConnect';
import PushSubscription from '@/lib/models/PushSubscription';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  await dbConnect();
  const subs = await PushSubscription.find({}).lean();
  // Return partial data for security — just enough to diagnose
  return res.json({
    count: subs.length,
    subscribers: subs.map(s => ({
      endpointEnd: s.endpoint?.slice(-40),
      hasP256dh: !!s.p256dh,
      hasAuth: !!s.auth,
      email: s.userEmail || '',
      createdAt: s.createdAt,
    })),
  });
}
