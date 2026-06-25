import dbConnect from '@/lib/dbConnect';
import PushSubscription from '@/lib/models/PushSubscription';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    const { subscription, email } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Valid subscription required' });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userEmail: email || '',
      },
      { upsert: true }
    );
    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body;
    if (endpoint) await PushSubscription.deleteOne({ endpoint });
    return res.json({ success: true });
  }

  res.status(405).end();
}
