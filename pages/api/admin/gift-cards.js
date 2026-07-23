import dbConnect from '@/lib/dbConnect';
import GiftCard from '@/lib/models/GiftCard';
import GiftCardTransaction from '@/lib/models/GiftCardTransaction';
import { createGiftCardAdjustment, normalizeGiftCardCode } from '@/lib/giftCardService';
import { sendGiftCardEmail } from '@/lib/giftCardEmail';

function isAuthorized(req) {
  const secret = req.headers['x-employee-secret'] || req.query?.secret || req.body?.secret;
  return Boolean(process.env.EMPLOYEE_API_SECRET) && secret === process.env.EMPLOYEE_API_SECRET;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  await dbConnect();

  if (req.method === 'GET') {
    const code = normalizeGiftCardCode(req.query?.code);
    if (code) {
      const card = await GiftCard.findOne({ code }).lean();
      if (!card) return res.status(404).json({ error: 'Gift card not found' });
      const transactions = await GiftCardTransaction.find({ giftCard: card._id }).sort({ createdAt: -1 }).lean();
      return res.json({ card, transactions });
    }

    const search = String(req.query?.search || '').trim();
    const query = search
      ? {
          $or: [
            { code: { $regex: search, $options: 'i' } },
            { recipientEmail: { $regex: search, $options: 'i' } },
            { purchaserEmail: { $regex: search, $options: 'i' } },
          ],
        }
      : {};
    const cards = await GiftCard.find(query).sort({ createdAt: -1 }).limit(150).lean();
    return res.json(cards);
  }

  const action = String(req.body?.action || '').trim();
  const code = normalizeGiftCardCode(req.body?.code);
  if (!code) return res.status(400).json({ error: 'Gift card code is required' });

  if (action === 'adjust') {
    try {
      const amount = Number(req.body?.amount || 0);
      const note = String(req.body?.note || '').trim();
      const result = await createGiftCardAdjustment({ code, amount, note });
      return res.json(result.card);
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Failed to adjust gift card' });
    }
  }

  if (action === 'lock' || action === 'unlock') {
    const nextStatus = action === 'lock' ? 'locked' : 'active';
    const card = await GiftCard.findOneAndUpdate(
      { code },
      { $set: { status: nextStatus } },
      { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Gift card not found' });
    return res.json(card);
  }

  if (action === 'resend') {
    const card = await GiftCard.findOne({ code });
    if (!card) return res.status(404).json({ error: 'Gift card not found' });
    if (!card.recipientEmail) return res.status(400).json({ error: 'Recipient email is missing' });

    const sent = await sendGiftCardEmail({
      to: card.recipientEmail,
      recipientName: card.recipientName,
      purchaserName: card.purchaserName,
      code: card.code,
      amount: card.initialAmount,
      balance: card.balance,
      message: card.message,
    });
    card.deliveryStatus = sent.sent ? 'sent' : 'failed';
    card.deliverySentAt = sent.sent ? new Date() : null;
    await card.save();

    return res.json({ success: sent.sent, card });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
