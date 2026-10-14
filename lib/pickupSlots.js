import Order from '@/lib/models/Order';
import { isDateTimeOpen } from '@/lib/storeHoursHelper';

export const SLOT_MINUTES = 15;
export const MAX_ORDERS_PER_SLOT = 6;
export const MIN_LEAD_MINUTES = 20;
export const SLOT_DAYS_AHEAD = 2;

const SLOT_MS = SLOT_MINUTES * 60 * 1000;

export function roundUpToSlot(date) {
  return new Date(Math.ceil(date.getTime() / SLOT_MS) * SLOT_MS);
}

// Count of active scheduled orders per slot start (ms) at a location between two dates
export async function getSlotCounts(pickupLocation, from, to) {
  const match = {
    scheduledTime: { $gte: from, $lt: to },
    paymentStatus: { $ne: 'failed' },
    status: { $nin: ['cancelled', 'canceled'] },
  };
  if (pickupLocation) match.pickupLocation = pickupLocation;
  const orders = await Order.find(match).select('scheduledTime').lean();
  const counts = {};
  for (const o of orders) {
    const key = Math.floor(new Date(o.scheduledTime).getTime() / SLOT_MS) * SLOT_MS;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export async function buildSlots(storeHoursDoc, pickupLocation, now = new Date()) {
  const start = roundUpToSlot(new Date(now.getTime() + MIN_LEAD_MINUTES * 60 * 1000));
  const end = new Date(now.getTime() + SLOT_DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const counts = await getSlotCounts(pickupLocation, start, end);
  const slots = [];
  for (let t = start.getTime(); t < end.getTime(); t += SLOT_MS) {
    if (!isDateTimeOpen(storeHoursDoc, new Date(t))) continue;
    const used = counts[t] || 0;
    slots.push({ time: new Date(t).toISOString(), available: used < MAX_ORDERS_PER_SLOT });
  }
  return slots;
}

export async function isSlotAvailable(storeHoursDoc, pickupLocation, scheduledTime, now = new Date()) {
  const t = new Date(scheduledTime).getTime();
  if (Number.isNaN(t)) return { ok: false, error: 'Invalid pickup time.' };
  if (t < now.getTime() + (MIN_LEAD_MINUTES - 1) * 60 * 1000) {
    return { ok: false, error: 'That pickup time is too soon. Please choose a later slot.' };
  }
  const slotStart = Math.floor(t / SLOT_MS) * SLOT_MS;
  const counts = await getSlotCounts(pickupLocation, new Date(slotStart), new Date(slotStart + SLOT_MS));
  if ((counts[slotStart] || 0) >= MAX_ORDERS_PER_SLOT) {
    return { ok: false, error: 'That pickup time just filled up. Please choose another slot.' };
  }
  return { ok: true };
}
