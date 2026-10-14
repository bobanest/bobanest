import crypto from 'crypto';
import AbandonedCart from '@/lib/models/AbandonedCart';

const MAX_ITEMS = 30;

export function newCartToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function normalizeEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  return /^\S+@\S+\.\S+$/.test(value) && value.length <= 254 ? value : '';
}

export function sanitizeCartItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.slice(0, MAX_ITEMS).map((item) => {
    const imageUrl = typeof item?.imageUrl === 'string' && /^https?:\/\//i.test(item.imageUrl) ? item.imageUrl.slice(0, 500) : '';
    const modifiers = Array.isArray(item?.modifiers)
      ? item.modifiers.slice(0, 20).map((m) => ({
          groupName: String(m?.groupName || '').slice(0, 80),
          options: Array.isArray(m?.options) ? m.options.slice(0, 20).map((o) => String(o).slice(0, 80)) : [],
        }))
      : [];
    return {
      id: String(item?.id || item?._id || '').slice(0, 80),
      name: String(item?.name || '').slice(0, 120),
      price: Math.max(0, Number(item?.price) || 0),
      quantity: Math.min(50, Math.max(1, Math.floor(Number(item?.quantity) || 1))),
      imageUrl,
      modifiers,
      isFreeBogo: Boolean(item?.isFreeBogo),
    };
  }).filter((item) => item.name);
}

export async function saveCartSnapshot({ email, items, pickupLocation }) {
  const safeEmail = normalizeEmail(email);
  if (!safeEmail) return null;

  const safeItems = sanitizeCartItems(items);
  const existing = await AbandonedCart.findOne({ email: safeEmail });

  if (existing?.status === 'unsubscribed') return existing;

  if (safeItems.length === 0) {
    if (existing && existing.status === 'active') {
      existing.status = 'closed';
      await existing.save();
    }
    return existing;
  }

  const subtotal = safeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const location = String(pickupLocation || '').slice(0, 200);

  if (!existing) {
    return AbandonedCart.create({
      email: safeEmail,
      token: newCartToken(),
      items: safeItems,
      subtotal,
      pickupLocation: location,
    });
  }

  if (existing.status !== 'active') {
    existing.status = 'active';
    existing.remindersSent = 0;
    existing.lastReminderAt = null;
    existing.recoveredAt = null;
  }
  existing.items = safeItems;
  existing.subtotal = subtotal;
  existing.pickupLocation = location;
  existing.lastActivityAt = new Date();
  await existing.save();
  return existing;
}

export async function markCartRecovered(email) {
  const safeEmail = normalizeEmail(email);
  if (!safeEmail) return;
  await AbandonedCart.updateOne(
    { email: safeEmail, status: 'active' },
    { $set: { status: 'recovered', recoveredAt: new Date() } }
  );
}
