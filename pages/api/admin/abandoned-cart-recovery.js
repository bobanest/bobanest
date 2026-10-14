import dbConnect from '@/lib/dbConnect';
import AbandonedCart from '@/lib/models/AbandonedCart';
import Customer from '@/lib/models/Customer';
import Order from '@/lib/models/Order';
import { sendMarketingEmail } from '@/lib/marketingEmail';

const HOUR = 60 * 60 * 1000;
const SITE_URL = (process.env.SITE_URL || 'https://www.bobanest.com').replace(/\/$/, '');
const MAX_PER_RUN = 100;

function isAuthorized(req) {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  return Boolean(cronSecret) && bearer === cronSecret;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function buildEmail(cart, reminderNumber, points) {
  const recoverUrl = `${SITE_URL}/cart?recover=${cart.token}`;
  const unsubscribeUrl = `${SITE_URL}/api/cart/unsubscribe?token=${cart.token}`;
  const rows = cart.items
    .filter((item) => !item.isFreeBogo)
    .map((item) => {
      const options = (item.modifiers || []).map((m) => `${escapeHtml(m.groupName)}: ${escapeHtml((m.options || []).join(', '))}`).join(' · ');
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>${escapeHtml(item.name)}</strong> × ${item.quantity}` +
        `${options ? `<br><span style="color:#888;font-size:12px">${options}</span>` : ''}</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">$${(item.price * item.quantity).toFixed(2)}</td></tr>`;
    })
    .join('');

  const rewardsLine = points >= 100
    ? `<p style="background:#f5f0ff;border-radius:8px;padding:12px;color:#5b21b6">🏆 You have <strong>${points} reward points</strong> — use them at checkout for $${Math.floor(points / 100) * 5} off.</p>`
    : '';

  const headline = reminderNumber === 1 ? 'Your boba is waiting 🧋' : 'Still thinking it over?';
  const intro = reminderNumber === 1
    ? 'You left a few things in your cart. Pick up where you left off:'
    : 'Your cart is still saved. Finish your order whenever you are ready:';

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:28px;background:#fff">
      <h2 style="color:#e91e8c;margin:0 0 8px">${headline}</h2>
      <p style="color:#555">${intro}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}
        <tr><td style="padding-top:12px"><strong>Subtotal</strong></td><td style="padding-top:12px;text-align:right"><strong>$${Number(cart.subtotal || 0).toFixed(2)}</strong></td></tr>
      </table>
      ${rewardsLine}
      <p style="text-align:center;margin:28px 0"><a href="${recoverUrl}" style="background:#e91e8c;color:#fff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px;display:inline-block">Complete my order</a></p>
      <p style="color:#999;font-size:12px;text-align:center">Bobanest · Zephyrhills, FL<br><a href="${unsubscribeUrl}" style="color:#999">Unsubscribe from cart reminders</a></p>
    </div>`;

  const text = `${headline}\n\n${intro}\n${recoverUrl}\n\nUnsubscribe: ${unsubscribeUrl}`;
  return { subject: headline, html, text };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  await dbConnect();
  const now = Date.now();
  const stats = { checked: 0, sent: 0, recovered: 0, closed: 0, failed: 0 };

  await AbandonedCart.updateMany(
    { status: 'active', lastActivityAt: { $lt: new Date(now - 7 * 24 * HOUR) } },
    { $set: { status: 'closed' } }
  );

  const candidates = await AbandonedCart.find({
    status: 'active',
    $or: [
      { remindersSent: 0, lastActivityAt: { $lte: new Date(now - HOUR) } },
      { remindersSent: 1, lastReminderAt: { $lte: new Date(now - 48 * HOUR) } },
    ],
  }).limit(MAX_PER_RUN);

  for (const cart of candidates) {
    stats.checked += 1;

    const paidSince = await Order.exists({
      customerEmail: cart.email,
      paymentStatus: 'paid',
      createdAt: { $gte: cart.lastActivityAt },
    });
    if (paidSince) {
      cart.status = 'recovered';
      cart.recoveredAt = new Date();
      await cart.save();
      stats.recovered += 1;
      continue;
    }

    const customer = await Customer.findOne({ email: cart.email }).select('points').lean();
    const { subject, html, text } = buildEmail(cart, cart.remindersSent + 1, customer?.points || 0);
    const result = await sendMarketingEmail({ to: cart.email, subject, html, text });

    if (result.sent) {
      cart.remindersSent += 1;
      cart.lastReminderAt = new Date();
      await cart.save();
      stats.sent += 1;
    } else {
      stats.failed += 1;
    }
  }

  return res.status(200).json(stats);
}
