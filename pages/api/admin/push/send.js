import webpush from 'web-push';
import dbConnect from '@/lib/dbConnect';
import PushSubscription from '@/lib/models/PushSubscription';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();

  if (!publicKey || !privateKey) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }

  webpush.setVapidDetails('mailto:bobanest.us@gmail.com', publicKey, privateKey);

  const { title, body, url = '/products' } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body required' });

  try {
    await dbConnect();
    const subscriptions = await PushSubscription.find({}).lean();
    const total = subscriptions.length;

    if (total === 0) return res.json({ success: true, sent: 0, failed: 0, total: 0, message: 'No subscribers found in DB' });

    const payload = JSON.stringify({ title, body, url });

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    const staleEndpoints = [];
    let sent = 0;
    let failed = 0;
    const errors = [];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        const err = result.reason;
        errors.push({ endpoint: subscriptions[i].endpoint.slice(-30), statusCode: err?.statusCode, message: err?.message });
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleEndpoints.push(subscriptions[i].endpoint);
        }
      }
    });

    if (staleEndpoints.length > 0) {
      await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } });
    }

    return res.json({ success: true, sent, failed, total, errors });
  } catch (err) {
    console.error('Push send error:', err);
    return res.status(500).json({ error: err.message });
  }
}
