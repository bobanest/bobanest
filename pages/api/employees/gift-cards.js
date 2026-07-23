import dbConnect from '@/lib/dbConnect';
import Employee from '@/lib/models/Employee';
import GiftCard from '@/lib/models/GiftCard';
import { normalizeGiftCardCode, redeemGiftCardBalance, maskGiftCardCode } from '@/lib/giftCardService';

function isAuthorized(req) {
  const secret = req.headers['x-employee-secret'] || req.body?.secret;
  const validSecret = process.env.EMPLOYEE_API_SECRET || process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET;
  return Boolean(validSecret) && secret === validSecret;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  await dbConnect();

  if (req.method === 'GET') {
    const code = normalizeGiftCardCode(req.query?.code);
    if (!code) return res.status(400).json({ error: 'Gift card code is required' });

    const card = await GiftCard.findOne({ code }).lean();
    if (!card) return res.status(404).json({ error: 'Gift card not found' });

    return res.json({
      code: maskGiftCardCode(card.code),
      normalizedCode: card.code,
      balance: Number(card.balance || 0),
      status: card.status,
      recipientName: card.recipientName || '',
    });
  }

  const code = normalizeGiftCardCode(req.body?.code);
  const amount = Number(req.body?.amount || 0);
  const assignedId = String(req.body?.assignedId || '').trim();
  if (!code) return res.status(400).json({ error: 'Gift card code is required' });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Redeem amount must be positive' });
  if (!assignedId) return res.status(400).json({ error: 'Assigned employee ID is required' });

  const employee = await Employee.findOne({ assignedId, isActive: true }).select('_id assignedId').lean();
  if (!employee) return res.status(404).json({ error: 'Employee not found or inactive' });

  try {
    const { card, transaction } = await redeemGiftCardBalance({
      code,
      amount,
      channel: 'in_store',
      employeeAssignedId: employee.assignedId,
      note: 'In-store redemption by employee',
    });

    return res.json({
      success: true,
      card: {
        code: maskGiftCardCode(card.code),
        normalizedCode: card.code,
        balance: Number(card.balance || 0),
        status: card.status,
      },
      transactionId: transaction?._id || null,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Failed to redeem gift card' });
  }
}
