import dbConnect from '@/lib/dbConnect';
import GiftCard from '@/lib/models/GiftCard';
import { normalizeGiftCardCode, maskGiftCardCode } from '@/lib/giftCardService';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await dbConnect();

  const code = normalizeGiftCardCode(req.body?.code);
  if (!code) return res.status(400).json({ error: 'Gift card code is required' });

  const card = await GiftCard.findOne({ code }).lean();
  if (!card) return res.status(404).json({ error: 'Gift card not found' });
  if (!['active', 'fully_redeemed'].includes(card.status)) {
    return res.status(400).json({ error: 'Gift card is not active' });
  }

  return res.json({
    code: maskGiftCardCode(card.code),
    normalizedCode: card.code,
    balance: Number(card.balance || 0),
    status: card.status,
    recipientName: card.recipientName || '',
  });
}
