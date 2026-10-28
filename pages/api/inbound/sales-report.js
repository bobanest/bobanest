import { Resend } from 'resend';
import dbConnect from '@/lib/dbConnect';
import Location from '@/lib/models/Location';
import SalesReport from '@/lib/models/SalesReport';
import { parseSalesSummaryCsv } from '@/lib/salesCsv';

export const config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1024 * 1024) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// sales+missionsq@x.resend.app -> "missionsq"
function tagFrom(addresses = []) {
  for (const a of addresses) {
    const m = /<?([^<>\s@]+)@/.exec(String(a));
    const plus = m && m[1].split('+')[1];
    if (plus) return plus;
  }
  return '';
}

async function resolveLocation(tag) {
  const t = norm(tag);
  if (!t) return '';
  const locs = await Location.find().lean();
  const hit = locs.find((l) => norm(l.slug) === t || norm(l.name) === t)
    || locs.find((l) => norm(l.slug).includes(t) || t.includes(norm(l.slug)) || norm(l.name).includes(t));
  return hit ? hit.slug : '';
}

// Reports usually arrive after close or the next morning, so a date in the subject wins; otherwise use the received date in store time.
function reportDateFor(subject, receivedAt) {
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(subject || '');
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return new Date(receivedAt || Date.now()).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  if (!secret || !apiKey) return res.status(500).json({ error: 'Not configured' });

  let payload;
  try {
    payload = await readRaw(req);
  } catch {
    return res.status(413).end();
  }

  const resend = new Resend(apiKey);
  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers['svix-id'] || '',
        timestamp: req.headers['svix-timestamp'] || '',
        signature: req.headers['svix-signature'] || '',
      },
      webhookSecret: secret,
    });
  } catch {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  if (event.type !== 'email.received') return res.status(200).json({ ignored: event.type });

  try {
    await dbConnect();
    const emailId = event.data.email_id || event.data.id;
    if (!emailId) return res.status(200).json({ ignored: 'no email id' });
    if (await SalesReport.exists({ emailId })) return res.status(200).json({ duplicate: true });

    const { data: email, error } = await resend.emails.receiving.get(emailId);
    if (error || !email) throw new Error(error?.message || 'Could not fetch email');

    const att = (email.attachments || []).find((a) => /\.csv$/i.test(a.filename || '') || /csv/i.test(a.content_type || ''));
    if (!att) return res.status(200).json({ ignored: 'no csv attachment' });

    const { data: list, error: lerr } = await resend.emails.receiving.attachments.list({ emailId });
    if (lerr) throw new Error(lerr.message);
    const meta = (list?.data || []).find((a) => a.id === att.id);
    if (!meta?.download_url) throw new Error('No attachment download url');

    const file = await fetch(meta.download_url);
    if (!file.ok) throw new Error(`Attachment download failed (${file.status})`);
    const { items, totals } = parseSalesSummaryCsv(await file.text());

    const tag = tagFrom(email.to);
    await SalesReport.create({
      emailId,
      location: await resolveLocation(tag),
      locationTag: tag,
      reportDate: reportDateFor(email.subject, email.created_at),
      subject: email.subject || '',
      fromAddress: email.from || '',
      filename: att.filename || '',
      receivedAt: email.created_at ? new Date(email.created_at) : new Date(),
      items,
      totals,
    });
    return res.status(200).json({ ok: true, items: items.length });
  } catch (err) {
    if (err?.code === 11000) return res.status(200).json({ duplicate: true });
    console.error('sales-report inbound failed:', err.message);
    // 500 lets Resend retry transient failures
    return res.status(500).json({ error: 'Processing failed' });
  }
}
