import dbConnect from '@/lib/dbConnect';
import Order from '@/lib/models/Order';
import MarketingAutomationLog from '@/lib/models/MarketingAutomationLog';
import { sendMarketingEmail } from '@/lib/marketingEmail';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bobanest.com';
const GOOGLE_REVIEW_URL = process.env.GOOGLE_REVIEW_URL || 'https://g.co/kgs/bobanest';

function isAuthorized(req) {
  const vercelCron = req.headers['x-vercel-cron'];
  if (vercelCron === '1') return true;

  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const secret = String(req.query?.secret || req.body?.secret || bearer || '').trim();
  const validSecrets = [
    process.env.CRON_SECRET,
    process.env.MARKETING_AUTOMATION_SECRET,
    process.env.EMPLOYEE_API_SECRET,
  ].filter(Boolean);
  return validSecrets.includes(secret);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function sendAbandonedCartEmails() {
  const now = Date.now();
  const minAge = new Date(now - 30 * 60 * 1000); // 30 minutes old
  const maxAge = new Date(now - 24 * 60 * 60 * 1000); // up to 24h old

  const orders = await Order.find({
    paymentStatus: 'pending',
    status: 'pending',
    customerEmail: { $exists: true, $ne: '' },
    createdAt: { $lte: minAge, $gte: maxAge },
  })
    .sort({ createdAt: -1 })
    .lean();

  let attempted = 0;
  let sent = 0;
  let skipped = 0;

  for (const order of orders) {
    const customerEmail = normalizeEmail(order.customerEmail);
    if (!customerEmail) {
      skipped += 1;
      continue;
    }

    const dedupeKey = `abandoned_cart:${order._id}`;
    const existing = await MarketingAutomationLog.findOne({ dedupeKey }).lean();
    if (existing) {
      skipped += 1;
      continue;
    }

    attempted += 1;
    const itemListHtml = (order.items || [])
      .map((item) => `<li>${Number(item.quantity || 1)}x ${escapeHtml(item.name || 'Item')}</li>`)
      .join('');
    const itemListText = (order.items || [])
      .map((item) => `- ${Number(item.quantity || 1)}x ${item.name || 'Item'}`)
      .join('\n');
    const orderTypeLabel = String(order.orderType || 'pickup').toUpperCase();
    const subject = 'You left some Bobanest favorites in your cart 🧋';
    const html = `
      <p>Hi there,</p>
      <p>It looks like you started an order but didn&apos;t complete checkout.</p>
      <p><strong>Your cart (${orderTypeLabel})</strong></p>
      <ul>${itemListHtml}</ul>
      <p><strong>Estimated total:</strong> ${formatCurrency(order.totalAmount)}</p>
      <p><a href="${BASE_URL}/cart">Return to your cart</a> or <a href="${BASE_URL}/products">browse the menu</a> to place your order.</p>
      <p>— Bobanest Team</p>
    `;
    const text = `Hi there,\n\nIt looks like you started an order but didn't complete checkout.\n\nYour cart (${orderTypeLabel}):\n${itemListText}\n\nEstimated total: ${formatCurrency(order.totalAmount)}\n\nReturn to your cart: ${BASE_URL}/cart\nBrowse menu: ${BASE_URL}/products\n\n— Bobanest Team`;

    const result = await sendMarketingEmail({ to: customerEmail, subject, html, text });
    if (!result.sent) {
      skipped += 1;
      continue;
    }

    await MarketingAutomationLog.create({
      type: 'abandoned_cart',
      dedupeKey,
      customerEmail,
      order: order._id,
      context: { trackingNumber: order.trackingNumber || null },
    });
    sent += 1;
  }

  return { attempted, sent, skipped, matchedOrders: orders.length };
}

async function sendPostPurchaseReviewRequests() {
  const now = Date.now();
  const minPaidAge = new Date(now - 2 * 60 * 60 * 1000); // paid at least 2h ago
  const maxPaidAge = new Date(now - 14 * 24 * 60 * 60 * 1000); // within last 14 days

  const orders = await Order.find({
    paymentStatus: 'paid',
    customerEmail: { $exists: true, $ne: '' },
    paidAt: { $lte: minPaidAge, $gte: maxPaidAge },
  })
    .sort({ paidAt: -1 })
    .lean();

  let attempted = 0;
  let sent = 0;
  let skipped = 0;

  for (const order of orders) {
    const customerEmail = normalizeEmail(order.customerEmail);
    if (!customerEmail) {
      skipped += 1;
      continue;
    }

    const dedupeKey = `post_purchase_review:${order._id}`;
    const existing = await MarketingAutomationLog.findOne({ dedupeKey }).lean();
    if (existing) {
      skipped += 1;
      continue;
    }

    attempted += 1;
    const customerName = escapeHtml(order.customerName || 'there');
    const subject = 'How was your Bobanest order?';
    const html = `
      <p>Hi ${customerName},</p>
      <p>Thanks for ordering from Bobanest. We&apos;d love to hear how we did.</p>
      <p>If you have 30 seconds, please leave us a quick Google review:</p>
      <p><a href="${GOOGLE_REVIEW_URL}">Leave a Google Review</a></p>
      <p>Your feedback helps more local customers discover us.</p>
      <p>— Bobanest Team</p>
    `;
    const text = `Hi ${order.customerName || 'there'},\n\nThanks for ordering from Bobanest. We'd love to hear how we did.\nLeave a Google review: ${GOOGLE_REVIEW_URL}\n\nYour feedback helps more local customers discover us.\n\n— Bobanest Team`;

    const result = await sendMarketingEmail({ to: customerEmail, subject, html, text });
    if (!result.sent) {
      skipped += 1;
      continue;
    }

    await MarketingAutomationLog.create({
      type: 'post_purchase_review',
      dedupeKey,
      customerEmail,
      order: order._id,
      context: { trackingNumber: order.trackingNumber || null },
    });
    sent += 1;
  }

  return { attempted, sent, skipped, matchedOrders: orders.length };
}

async function sendWinBackEmails() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const monthWindowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  const paidByCustomer = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        customerEmail: { $exists: true, $ne: '' },
      },
    },
    {
      $project: {
        customerEmail: { $toLower: '$customerEmail' },
        paidAt: '$paidAt',
        createdAt: '$createdAt',
      },
    },
    {
      $addFields: {
        activityAt: { $ifNull: ['$paidAt', '$createdAt'] },
      },
    },
    { $sort: { customerEmail: 1, activityAt: -1 } },
    {
      $group: {
        _id: '$customerEmail',
        lastPaidAt: { $first: '$activityAt' },
        orderCount: { $sum: 1 },
      },
    },
    {
      $match: {
        lastPaidAt: { $lte: thirtyDaysAgo },
        orderCount: { $gte: 1 },
      },
    },
    { $limit: 1000 },
  ]);

  let attempted = 0;
  let sent = 0;
  let skipped = 0;

  for (const row of paidByCustomer) {
    const customerEmail = normalizeEmail(row._id);
    if (!customerEmail) {
      skipped += 1;
      continue;
    }

    const dedupeKey = `win_back:${customerEmail}:${monthKey}`;
    const existing = await MarketingAutomationLog.findOne({ dedupeKey }).lean();
    if (existing) {
      skipped += 1;
      continue;
    }

    attempted += 1;
    const subject = 'We miss you at Bobanest 💛';
    const html = `
      <p>Hi there,</p>
      <p>It&apos;s been a while since your last Bobanest order.</p>
      <p>We&apos;d love to serve you again — explore what&apos;s new on our menu and rewards program:</p>
      <p><a href="${BASE_URL}/products">View Menu</a> · <a href="${BASE_URL}/loyalty">Check Rewards</a></p>
      <p>Thanks for supporting local.</p>
      <p>— Bobanest Team</p>
    `;
    const text = `Hi there,\n\nIt's been a while since your last Bobanest order.\nWe'd love to serve you again.\nView menu: ${BASE_URL}/products\nCheck rewards: ${BASE_URL}/loyalty\n\nThanks for supporting local.\n— Bobanest Team`;

    const result = await sendMarketingEmail({ to: customerEmail, subject, html, text });
    if (!result.sent) {
      skipped += 1;
      continue;
    }

    await MarketingAutomationLog.create({
      type: 'win_back',
      dedupeKey,
      customerEmail,
      windowStart: monthWindowStart,
      context: { lastPaidAt: row.lastPaidAt },
    });
    sent += 1;
  }

  return { attempted, sent, skipped, matchedCustomers: paidByCustomer.length, monthKey };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  await dbConnect();

  try {
    const [abandonedCart, postPurchaseReview, winBack] = await Promise.all([
      sendAbandonedCartEmails(),
      sendPostPurchaseReviewRequests(),
      sendWinBackEmails(),
    ]);

    return res.status(200).json({
      success: true,
      abandonedCart,
      postPurchaseReview,
      winBack,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Customer marketing automation error:', error);
    return res.status(500).json({ error: 'Failed to run customer marketing automation' });
  }
}
