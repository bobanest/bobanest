import dbConnect from '@/lib/dbConnect';
import PosSetting from '@/lib/models/PosSetting';
import { hashPasscode, isHashedPasscode, verifyPasscode } from '@/lib/posPasscode';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60 * 1000;
const attempts = new Map();

function clientKey(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = clientKey(req);
  const record = attempts.get(key);
  if (record && record.count >= MAX_ATTEMPTS && Date.now() - record.last < LOCK_MS) {
    return res.status(429).json({ ok: false, error: 'Too many attempts. Try again in a minute.' });
  }

  await dbConnect();
  const setting = await PosSetting.findOne({ key: 'fullscreenPasscode' }).lean();
  const stored = setting?.value;
  const ok = verifyPasscode(req.body?.passcode, stored);

  if (!ok) {
    attempts.set(key, { count: (record && Date.now() - record.last < LOCK_MS ? record.count : 0) + 1, last: Date.now() });
    return res.status(200).json({ ok: false });
  }

  attempts.delete(key);
  if (!isHashedPasscode(stored)) {
    await PosSetting.updateOne(
      { key: 'fullscreenPasscode' },
      { $set: { value: hashPasscode(req.body.passcode), updatedAt: new Date() } }
    );
  }
  return res.status(200).json({ ok: true });
}
