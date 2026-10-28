// Parser for the Shift4/SkyTab "Sales Summary by Item" CSV export.
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const round = (n) => Math.round(n * 100) / 100;

export function parseSalesSummaryCsv(text) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('CSV is empty');

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name) => header.indexOf(name);
  const idx = {
    item: col('item'),
    revenueClass: col('revenue class'),
    department: col('department'),
    qty: col('qty'),
    discounts: col('discounts'),
    gross: col('gross sales'),
    net: col('net sales'),
  };
  if (idx.item < 0 || idx.qty < 0 || idx.gross < 0 || idx.net < 0) {
    throw new Error('Unrecognized CSV: expected the Sales Summary by Item export');
  }

  const items = [];
  for (const line of lines.slice(1)) {
    const c = splitCsvLine(line);
    const name = (c[idx.item] || '').trim();
    if (!name || /^totals?:?$/i.test(name)) continue;
    items.push({
      item: name,
      revenueClass: (c[idx.revenueClass] || '').trim(),
      department: (c[idx.department] || '').trim(),
      qty: num(c[idx.qty]),
      discounts: idx.discounts >= 0 ? num(c[idx.discounts]) : 0,
      grossSales: num(c[idx.gross]),
      netSales: num(c[idx.net]),
    });
  }
  if (!items.length) throw new Error('No item rows found in CSV');

  const totals = items.reduce(
    (t, i) => ({
      qty: t.qty + i.qty,
      grossSales: t.grossSales + i.grossSales,
      discounts: t.discounts + i.discounts,
      netSales: t.netSales + i.netSales,
    }),
    { qty: 0, grossSales: 0, discounts: 0, netSales: 0 }
  );
  Object.keys(totals).forEach((k) => { totals[k] = round(totals[k]); });
  return { items, totals };
}
