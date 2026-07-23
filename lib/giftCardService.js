import GiftCard from '@/lib/models/GiftCard';
import GiftCardTransaction from '@/lib/models/GiftCardTransaction';

export function normalizeGiftCardCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

export function maskGiftCardCode(value) {
  const code = normalizeGiftCardCode(value);
  if (code.length <= 4) return code;
  return `${'*'.repeat(Math.max(0, code.length - 4))}${code.slice(-4)}`;
}

export function generateGiftCardCode() {
  return `BNGC${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export async function generateUniqueGiftCardCode() {
  for (let i = 0; i < 8; i += 1) {
    const candidate = generateGiftCardCode();
    // eslint-disable-next-line no-await-in-loop
    const exists = await GiftCard.findOne({ code: candidate }).select('_id').lean();
    if (!exists) return candidate;
  }
  throw new Error('Unable to generate unique gift card code');
}

export async function redeemGiftCardBalance({
  code,
  amount,
  channel = 'web',
  orderId = null,
  employeeAssignedId = '',
  note = '',
}) {
  const normalizedCode = normalizeGiftCardCode(code);
  const normalizedAmount = Number(amount || 0);
  if (!normalizedCode) throw new Error('Gift card code is required');
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) throw new Error('Redeem amount must be positive');

  if (orderId) {
    const existingTx = await GiftCardTransaction.findOne({
      orderId,
      code: normalizedCode,
      type: 'redeem',
    }).lean();
    if (existingTx) {
      return { alreadyApplied: true, transaction: existingTx };
    }
  }

  const card = await GiftCard.findOneAndUpdate(
    {
      code: normalizedCode,
      status: 'active',
      balance: { $gte: normalizedAmount },
    },
    {
      $inc: { balance: -normalizedAmount },
      $set: { lastRedeemedAt: new Date() },
    },
    { new: true }
  );

  if (!card) {
    throw new Error('Gift card is invalid, inactive, or does not have enough balance');
  }

  const balanceAfter = Number(card.balance || 0);
  const balanceBefore = balanceAfter + normalizedAmount;
  const nextStatus = balanceAfter <= 0 ? 'fully_redeemed' : 'active';
  if (card.status !== nextStatus) {
    card.status = nextStatus;
    await card.save();
  }

  const transaction = await GiftCardTransaction.create({
    giftCard: card._id,
    code: normalizedCode,
    type: 'redeem',
    channel,
    amount: -normalizedAmount,
    balanceBefore,
    balanceAfter,
    orderId,
    employeeAssignedId: employeeAssignedId || '',
    note: note || '',
  });

  return { card, transaction, alreadyApplied: false };
}

export async function createGiftCardAdjustment({ code, amount, note = '' }) {
  const normalizedCode = normalizeGiftCardCode(code);
  const delta = Number(amount || 0);
  if (!normalizedCode) throw new Error('Gift card code is required');
  if (!Number.isFinite(delta) || delta === 0) throw new Error('Adjustment amount must be non-zero');

  let card;
  if (delta > 0) {
    card = await GiftCard.findOneAndUpdate(
      { code: normalizedCode, status: { $in: ['active', 'fully_redeemed'] } },
      { $inc: { balance: delta } },
      { new: true }
    );
  } else {
    const debit = Math.abs(delta);
    card = await GiftCard.findOneAndUpdate(
      { code: normalizedCode, status: { $in: ['active', 'fully_redeemed'] }, balance: { $gte: debit } },
      { $inc: { balance: -debit } },
      { new: true }
    );
  }

  if (!card) {
    throw new Error('Unable to adjust card balance');
  }

  const balanceAfter = Number(card.balance || 0);
  const balanceBefore = balanceAfter - delta;
  const nextStatus = balanceAfter <= 0 ? 'fully_redeemed' : 'active';
  if (card.status !== nextStatus) {
    card.status = nextStatus;
    await card.save();
  }

  const transaction = await GiftCardTransaction.create({
    giftCard: card._id,
    code: normalizedCode,
    type: 'adjustment',
    channel: 'admin',
    amount: delta,
    balanceBefore,
    balanceAfter,
    note: note || '',
  });

  return { card, transaction };
}
