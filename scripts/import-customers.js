// Usage: node scripts/import-customers.js <csv path> [--apply]
// Imports a Shift4 customer directory (name + phone, email optional). Dry-run unless --apply.
const fs = require('fs');
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some(c => c.trim())) rows.push(row);
      row = [];
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); if (row.some(c => c.trim())) rows.push(row); }
  return rows;
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits.length >= 10 ? `+${digits}` : '';
}

(async () => {
  const file = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!file || !process.env.MONGODB_URI) {
    console.error('Usage: MONGODB_URI=... node scripts/import-customers.js <csv> [--apply]');
    process.exit(1);
  }
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const head = rows.shift().map(h => h.trim());
  const col = name => head.indexOf(name);
  const contacts = [];
  for (const r of rows) {
    const name = [r[col('First Name')], r[col('Last Name')]].map(s => (s || '').trim()).filter(Boolean).join(' ');
    const phone = normalizePhone(r[col('Mobile Phone')]) || normalizePhone(r[col('Home Phone')]);
    const email = (r[col('Primary Email')] || r[col('Secondary Email')] || '').trim().toLowerCase();
    if (!phone && !email) { console.log('Skipping (no phone/email):', name); continue; }
    contacts.push({ name, phone, email });
  }

  // Some networks block SRV DNS lookups; resolve over HTTPS and use a direct connection string
  let uri = process.env.MONGODB_URI;
  const m = uri.match(/^mongodb\+srv:\/\/([^@]+)@([^/?]+)(\/[^?]*)?(\?.*)?$/);
  if (m) {
    const host = m[2];
    const doh = async (type) => (await (await fetch(`https://dns.google/resolve?name=${type === 'SRV' ? '_mongodb._tcp.' : ''}${host}&type=${type}`)).json()).Answer || [];
    const hosts = (await doh('SRV')).map(a => a.data.split(' ')[3].replace(/\.$/, '') + ':' + a.data.split(' ')[2]);
    const txt = ((await doh('TXT'))[0]?.data || '').replace(/"/g, '');
    if (hosts.length) uri = `mongodb://${m[1]}@${hosts.join(',')}${m[3] || '/'}?tls=true&${txt}${m[4] ? '&' + m[4].slice(1) : ''}`;
  }
  await mongoose.connect(uri);
  const col_ = mongoose.connection.collection('customers');

  if (apply) {
    // Email must be a sparse unique index so phone-only customers can exist
    const idx = await col_.indexes();
    const emailIdx = idx.find(i => i.name === 'email_1');
    if (emailIdx && !emailIdx.sparse) await col_.dropIndex('email_1');
    await col_.createIndex({ email: 1 }, { unique: true, sparse: true });
    await col_.createIndex({ phone: 1 }, { sparse: true });
  }

  let created = 0, updated = 0, skipped = 0;
  for (const c of contacts) {
    const or = [];
    if (c.email) or.push({ email: c.email });
    if (c.phone) or.push({ phone: c.phone });
    const existing = await col_.findOne({ $or: or });
    if (existing) {
      const set = {};
      if (c.phone && !existing.phone) set.phone = c.phone;
      if (c.name && !existing.name) set.name = c.name;
      if (Object.keys(set).length) { if (apply) await col_.updateOne({ _id: existing._id }, { $set: set }); updated++; }
      else skipped++;
    } else {
      const doc = { name: c.name, points: 0, favoriteOrders: [], source: 'shift4', createdAt: new Date() };
      if (c.phone) doc.phone = c.phone;
      if (c.email) doc.email = c.email;
      if (apply) await col_.insertOne(doc);
      created++;
    }
  }
  console.log(`${apply ? 'APPLIED' : 'DRY RUN'}: parsed=${contacts.length} created=${created} updated=${updated} unchanged=${skipped}`);
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
