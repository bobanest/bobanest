import dbConnect from '@/lib/dbConnect';
import AbandonedCart from '@/lib/models/AbandonedCart';

export default async function handler(req, res) {
  const token = String(req.query?.token || '');
  let message = 'This unsubscribe link is not valid.';

  if (/^[a-f0-9]{48}$/.test(token)) {
    await dbConnect();
    const result = await AbandonedCart.updateOne({ token }, { $set: { status: 'unsubscribed' } });
    if (result.matchedCount > 0) {
      message = 'You are unsubscribed. You will no longer receive cart reminder emails from Bobanest.';
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bobanest</title></head>` +
    `<body style="font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 20px;text-align:center">` +
    `<h2>Bobanest 🧋</h2><p>${message}</p><p><a href="/">Back to the menu</a></p></body></html>`
  );
}
