import Stripe from 'stripe';
import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import Customer from '@/lib/models/Customer';
import { sendOwnerEmail } from '@/lib/ownerEmail';
import { markCartRecovered } from '@/lib/abandonedCart';
import Product from '@/lib/models/Product';
import Location from '@/lib/models/Location';
import ModifierGroup from '@/lib/models/Modifier';
import Promotion from '@/lib/models/Promotion';
import StoreHours from '@/lib/models/StoreHours';
import { getStoreStatusAt } from '@/lib/storeHoursHelper';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const QR_SOURCE = 'qr';
export const MAX_QR_QUANTITY = 10;
const MAX_CART_LINES = 20;
const MIN_CHARGE_CENTS = 50;

export function getStripe() {
  return stripe;
}

class PricingError extends Error {}
export { PricingError };

function groupApplies(group, productId) {
  const list = Array.isArray(group.applicableProducts) ? group.applicableProducts : [];
  return list.length === 0 || list.some((id) => String(id) === String(productId));
}

function computePromotions(lines, subtotal, promos, now) {
  let total = 0;
  const applied = [];
  for (const promo of promos) {
    if (promo.startDate && new Date(promo.startDate) > now) continue;
    if (promo.endDate && new Date(promo.endDate) < now) continue;
    const ids = (promo.applicableProducts || []).map((p) => String(p._id || p));
    if (ids.length > 0 && !lines.some((l) => ids.includes(String(l.id)))) continue;
    const min = Number(promo.minOrderAmount || 0);
    let amount = 0;
    if (promo.type === 'percentage' && subtotal >= min) {
      amount = (subtotal * promo.value) / 100;
    } else if (promo.type === 'fixed' && subtotal >= min) {
      amount = promo.value;
    } else if (promo.type === 'bogo') {
      const eligible = lines.filter((l) => l.quantity >= 2 && (ids.length === 0 || ids.includes(String(l.id))));
      amount = eligible.reduce((sum, l) => sum + l.price * Math.floor(l.quantity / 2), 0);
    } else if (promo.type === 'second_discount' && lines.length >= 2) {
      const sorted = lines.map((l) => l.price).sort((a, b) => a - b);
      amount = sorted[1] * (promo.value / 100);
    }
    if (amount > 0) {
      total += amount;
      applied.push({ promotionId: String(promo._id), name: promo.name, type: promo.type, discountAmount: amount });
    }
  }
  return { total: Math.min(total, subtotal), applied };
}

// Prices a cart entirely from database data (client prices are never trusted).
export async function priceCart({ items, pickupLocation }) {
  await dbConnect();
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_CART_LINES) {
    throw new PricingError('Your cart is empty or too large for quick pay.');
  }

  const ids = items.map((i) => String(i?.id || ''));
  const products = await Product.find({ _id: { $in: ids.filter((id) => /^[a-f\d]{24}$/i.test(id)) } }).lean();
  const groups = await ModifierGroup.find({}).lean();

  const lines = items.map((raw, idx) => {
    const product = products.find((p) => String(p._id) === ids[idx]);
    const quantity = Math.floor(Number(raw.quantity));
    if (!product || product.inStock === false || !(Number(product.price) > 0)) {
      throw new PricingError('Some items can’t be paid with Apple Pay / Google Pay. Please use card checkout.');
    }
    if (!(quantity >= 1 && quantity <= MAX_QR_QUANTITY)) throw new PricingError('Invalid quantity.');

    let unit = Number(product.price);
    const modifiers = [];
    for (const mod of Array.isArray(raw.modifiers) ? raw.modifiers : []) {
      const group = groups.find((g) => g.name === mod?.groupName && groupApplies(g, product._id));
      const names = Array.isArray(mod?.options) ? mod.options : [];
      if (!group || names.length === 0 || (!group.multiple && names.length > 1)) {
        throw new PricingError('One of the customizations is no longer available. Please re-add the item.');
      }
      for (const name of names) {
        const option = group.options.find((o) => o.name === name);
        if (!option) throw new PricingError('One of the customizations is no longer available. Please re-add the item.');
        unit += Number(option.price || 0);
      }
      modifiers.push({ groupName: group.name, options: names });
    }
    unit = Math.round(unit * 100) / 100;
    return { id: String(product._id), name: product.name, price: unit, quantity, modifiers };
  });

  const locationName = String(pickupLocation || '').trim();
  const locations = (await Location.find({}).lean()).filter((l) => l.isActive !== false && !l.isComingSoon);
  const location = locations.find((l) => l.name === locationName) || (!locationName && locations.length === 1 ? locations[0] : null);
  if (!location) throw new PricingError('Please choose a valid pickup location.');

  const storeHours = await StoreHours.findOne({}).lean();
  if (storeHours && !getStoreStatusAt(storeHours, new Date()).isOpen) {
    throw new PricingError('We are closed right now. Please use card checkout to schedule for later.');
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const promos = await Promotion.find({ isActive: true }).lean();
  const { total: discount, applied } = computePromotions(lines, subtotal, promos, new Date());
  const amount = Math.round((subtotal - discount) * 100);
  if (amount < MIN_CHARGE_CENTS) throw new PricingError('This order is too small for quick pay.');

  return { lines, location: location.name, subtotal, discount, appliedPromotions: applied, amount };
}

// Marks a QR order paid once Stripe confirms the PaymentIntent. Safe to call repeatedly (webhook + return page).
export async function finalizeQrOrder(paymentIntentId) {
  await dbConnect();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
  if (pi.status !== 'succeeded' || pi.metadata?.source !== QR_SOURCE || !pi.metadata?.orderId) return null;

  const billing = pi.latest_charge?.billing_details || {};
  const email = String(billing.email || pi.receipt_email || '').toLowerCase().trim();
  const total = (pi.amount_received || pi.amount) / 100;

  const set = {
    paymentStatus: 'paid',
    stripePaymentIntentId: pi.id,
    totalAmount: total,
  };
  const order = await Order.findOneAndUpdate(
    { _id: pi.metadata.orderId, paymentStatus: { $ne: 'paid' } },
    { $set: set },
    { new: true }
  );

  if (!order) {
    return Order.findById(pi.metadata.orderId).lean();
  }

  // Contact details come from the wallet sheet (Apple Pay / Google Pay)
  if (billing.name) order.customerName = billing.name;
  if (email) order.customerEmail = email;
  if (billing.phone) order.customerPhone = billing.phone;
  await order.save();

  if (email) {
    markCartRecovered(email).catch(() => {});
    const points = Math.floor(total);
    if (points > 0) {
      await Customer.findOneAndUpdate(
        { email },
        { $inc: { points }, $setOnInsert: { name: order.customerName || '', favoriteOrders: [] } },
        { upsert: true }
      ).catch(() => {});
    }
  }

  const itemsHtml = (order.items || [])
    .map((item) => `<li>${item.quantity || 1}x ${item.name || 'Item'} - $${Number(item.price || 0).toFixed(2)}</li>`)
    .join('');
  sendOwnerEmail({
    subject: `QR Order Paid: #${order.trackingNumber}`,
    html: `
      <h3>QR Order Payment Confirmed (Apple Pay / Google Pay)</h3>
      <p><strong>Tracking #:</strong> ${order.trackingNumber}</p>
      <p><strong>Customer:</strong> ${order.customerName || 'N/A'}</p>
      <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
      <p><strong>Pickup location:</strong> ${order.pickupLocation || 'N/A'}</p>
      <p><strong>Total:</strong> $${Number(order.totalAmount || 0).toFixed(2)}</p>
      <ul>${itemsHtml}</ul>
    `,
  }).catch(() => {});

  return order.toObject();
}
