'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

const emptyItem = { productName: '', quantity: '' };

function parseCSV(text) {
  // Proper CSV field parser that handles quoted fields (e.g. "Mango, Fruit")
  function splitRow(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], totals: null };

  const headers = splitRow(lines[0]).map(h => h.toLowerCase());
  const itemIdx    = headers.findIndex(h => h === 'item');
  const qtyIdx     = headers.findIndex(h => h === 'qty' || h === 'quantity');
  const grossIdx   = headers.findIndex(h => h === 'gross sales' || h === 'gross');
  const netIdx     = headers.findIndex(h => h === 'net sales' || h === 'net');
  const discIdx    = headers.findIndex(h => h === 'discounts' || h === 'discount');

  if (itemIdx === -1 || qtyIdx === -1) return null;

  const rows = [];
  let totalsRow = null;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    const name = (cols[itemIdx] || '').replace(/^"(.*)"$/, '$1').trim();
    if (!name) continue;

    // Capture the Totals row separately — use it as authoritative financial totals
    if (name.toLowerCase().startsWith('total')) {
      totalsRow = {
        gross:    grossIdx >= 0 ? (parseFloat(cols[grossIdx]) || 0) : 0,
        net:      netIdx   >= 0 ? (parseFloat(cols[netIdx])   || 0) : 0,
        discounts: discIdx >= 0 ? (parseFloat(cols[discIdx])  || 0) : 0,
      };
      continue;
    }

    const qty = parseInt(cols[qtyIdx], 10);
    if (isNaN(qty) || qty <= 0) continue;

    rows.push({
      productName: name,
      quantity: qty,
      grossSales: grossIdx >= 0 ? (parseFloat(cols[grossIdx]) || 0) : 0,
      netSales:   netIdx   >= 0 ? (parseFloat(cols[netIdx])   || 0) : 0,
      discounts:  discIdx  >= 0 ? (parseFloat(cols[discIdx])  || 0) : 0,
    });
  }

  return { rows, totals: totalsRow };
}

export default function AdminWalkIn() {
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // CSV import state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvDate, setCsvDate] = useState(new Date().toISOString().slice(0, 10));
  const [csvNote, setCsvNote] = useState('Sales summary import');
  const [csvRows, setCsvRows] = useState([]);
  const [csvParsedTotals, setCsvParsedTotals] = useState(null);
  const [csvError, setCsvError] = useState('');
  const [csvSaving, setCsvSaving] = useState(false);
  const [csvMsg, setCsvMsg] = useState('');
  // Revenue-only patch mode — for re-importing without re-deducting inventory
  const [fixRevMode, setFixRevMode] = useState(false);

  // Inline revenue editing state for past logs
  const [editRevId, setEditRevId] = useState(null);
  const [editRevForm, setEditRevForm] = useState({ grossSales: '', netSales: '', discounts: '' });
  const [editRevSaving, setEditRevSaving] = useState(false);

  // Deduction state for past logs
  const [deductingId, setDeductingId] = useState(null);
  const [deductMsg, setDeductMsg] = useState({});

  useEffect(() => {
    fetch('/api/admin/products').then(r => r.json()).then(setProducts);
    fetchLogs();
  }, []);

  const fetchLogs = () => {
    fetch('/api/admin/walkin').then(r => r.json()).then(setLogs);
  };

  const addItem = () => setItems(p => [...p, { ...emptyItem }]);
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) =>
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = items.filter(i => i.productName && i.quantity > 0);
    if (!valid.length) {
      setMsg('Add at least one product with a quantity.');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/walkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, items: valid, note }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`✓ Logged. Deducted ingredients for ${data.deductions} item(s) from inventory.`);
      setItems([{ ...emptyItem }]);
      setNote('');
      fetchLogs();
    } else {
      setMsg(`Error: ${data.error}`);
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 5000);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this log?\n\nNote: inventory will NOT be automatically re-added.')) return;
    await fetch('/api/admin/walkin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchLogs();
  };

  const totalQty = (log) => log.items.reduce((s, i) => s + i.quantity, 0);

  const handleCsvFile = (e) => {
    setCsvError('');
    setCsvRows([]);
    setCsvParsedTotals(null);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (parsed === null) {
        setCsvError('CSV must have "Item" and "Qty" columns.');
      } else if (parsed.rows.length === 0) {
        setCsvError('No valid rows found in the CSV.');
      } else {
        setCsvRows(parsed.rows);
        setCsvParsedTotals(parsed.totals);
      }
    };
    reader.readAsText(file);
  };

  const updateCsvRow = (i, field, value) =>
    setCsvRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const removeCsvRow = (i) =>
    setCsvRows(rows => rows.filter((_, idx) => idx !== i));

  const handleCsvSubmit = async () => {
    if (!csvRows.length) return;
    setCsvSaving(true);
    setCsvMsg('');
    const finalGross = csvParsedTotals?.gross ?? csvTotals.gross;
    const finalNet   = csvParsedTotals?.net   ?? csvTotals.net;
    const finalDisc  = csvParsedTotals?.discounts ?? csvTotals.disc;

    if (fixRevMode) {
      // Revenue-only patch: find existing log by date and update revenue fields only
      const matchDate = new Date(csvDate).toISOString().slice(0, 10);
      const existing = logs.find(l => new Date(l.date).toISOString().slice(0, 10) === matchDate);
      if (!existing) {
        setCsvMsg(`No existing log found for ${matchDate}. Switch off "Revenue only" to create a new log.`);
        setCsvSaving(false);
        return;
      }
      const res = await fetch('/api/admin/walkin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing._id, grossSales: finalGross, netSales: finalNet, discounts: finalDisc }),
      });
      if (res.ok) {
        setCsvMsg(`✓ Updated revenue for ${matchDate}: Net $${finalNet.toFixed(2)}`);
        setCsvRows([]);
        fetchLogs();
      } else {
        setCsvMsg('Error updating revenue.');
      }
      setCsvSaving(false);
      return;
    }

    const items = csvRows.map(r => ({ productName: r.productName, quantity: Number(r.quantity) }));
    const res = await fetch('/api/admin/walkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: csvDate,
        items,
        note: csvNote,
        source: 'csv_import',
        grossSales: finalGross,
        netSales: finalNet,
        discounts: finalDisc,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setCsvMsg(`✓ Imported ${csvRows.length} items. Deducted ingredients for ${data.deductions} item(s).`);
      setCsvRows([]);
      fetchLogs();
    } else {
      setCsvMsg(`Error: ${data.error}`);
    }
    setCsvSaving(false);
  };

  const csvTotals = csvRows.reduce(
    (acc, r) => ({ qty: acc.qty + Number(r.quantity), gross: acc.gross + r.grossSales, net: acc.net + r.netSales, disc: acc.disc + r.discounts }),
    { qty: 0, gross: 0, net: 0, disc: 0 }
  );
  // Display the authoritative totals from the CSV Totals row if available
  const displayTotals = {
    qty: csvTotals.qty,
    gross: csvParsedTotals?.gross ?? csvTotals.gross,
    net: csvParsedTotals?.net ?? csvTotals.net,
    disc: csvParsedTotals?.discounts ?? csvTotals.disc,
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Walk-in Sales Log</h1>
          <p className="text-gray-500 mb-6 text-sm">
            Enter daily POS totals to auto-deduct supply inventory based on product recipes.
          </p>

          {/* CSV Import Section */}
          <div className="bg-white rounded-xl shadow border border-gray-100 mb-6 overflow-hidden">
            <button
              onClick={() => setCsvOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
            >
              <div>
                <p className="font-semibold text-gray-800">Import from CSV</p>
                <p className="text-xs text-gray-500 mt-0.5">Upload a POS sales summary CSV to bulk-import items</p>
              </div>
              <span className="text-gray-400 text-sm">{csvOpen ? '▲ Collapse' : '▼ Expand'}</span>
            </button>

            {csvOpen && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <div className="flex flex-wrap gap-4 mt-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Date / Period End Date</label>
                    <input
                      type="date"
                      value={csvDate}
                      onChange={e => setCsvDate(e.target.value)}
                      className="border p-2 rounded text-sm"
                    />
                  </div>
                  <div className="flex-1 min-w-48">
                    <label className="block text-xs font-semibold mb-1">Note</label>
                    <input
                      type="text"
                      value={csvNote}
                      onChange={e => setCsvNote(e.target.value)}
                      className="w-full border p-2 rounded text-sm"
                      placeholder="e.g. April 1–28 sales summary"
                    />
                  </div>
                </div>

                <label className="block text-xs font-semibold mb-1">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFile}
                  className="block text-sm mb-3"
                />
                <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fixRevMode}
                    onChange={e => setFixRevMode(e.target.checked)}
                    className="rounded"
                  />
                  <span className="font-medium text-orange-700">Revenue only (fix existing log — no inventory deduction)</span>
                </label>
                {fixRevMode && (
                  <p className="text-xs text-orange-600 bg-orange-50 rounded px-3 py-2 mb-3">
                    This will find the existing log for the selected date and update only the revenue figures. Use this to fix logs that were imported before the revenue bug was fixed.
                  </p>
                )}
                {csvError && <p className="text-red-500 text-sm mb-3">{csvError}</p>}

                {csvRows.length > 0 && (
                  <>
                    {/* Summary bar */}
                    <div className="flex gap-4 flex-wrap text-sm bg-gray-50 rounded-lg px-4 py-2 mb-3 text-gray-600">
                      <span><strong>{csvRows.length}</strong> items</span>
                      <span><strong>{displayTotals.qty}</strong> total qty</span>
                      <span>Gross: <strong>${displayTotals.gross.toFixed(2)}</strong></span>
                      <span>Net: <strong>${displayTotals.net.toFixed(2)}</strong></span>
                      <span>Discounts: <strong>${displayTotals.disc.toFixed(2)}</strong></span>
                      {csvParsedTotals && <span className="text-green-600 text-xs ml-1">✓ totals from CSV</span>}
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2 font-semibold">Item</th>
                            <th className="text-right p-2 font-semibold">Qty</th>
                            <th className="text-right p-2 font-semibold">Gross Sales</th>
                            <th className="text-right p-2 font-semibold">Net Sales</th>
                            <th className="text-right p-2 font-semibold">Discounts</th>
                            <th className="p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.map((row, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={row.productName}
                                  onChange={e => updateCsvRow(i, 'productName', e.target.value)}
                                  className="border rounded px-2 py-1 text-sm w-full"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={row.quantity}
                                  onChange={e => updateCsvRow(i, 'quantity', e.target.value)}
                                  className="border rounded px-2 py-1 text-sm w-16 text-right"
                                />
                              </td>
                              <td className="p-2 text-right text-gray-500">${row.grossSales.toFixed(2)}</td>
                              <td className="p-2 text-right text-gray-500">${row.netSales.toFixed(2)}</td>
                              <td className="p-2 text-right text-gray-500">${row.discounts.toFixed(2)}</td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeCsvRow(i)}
                                  className="text-red-400 hover:text-red-600 text-base w-7 h-7"
                                >✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {csvMsg && (
                      <p className={`text-sm mb-3 ${csvMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                        {csvMsg}
                      </p>
                    )}

    <button
                      onClick={handleCsvSubmit}
                      disabled={csvSaving || csvRows.length === 0}
                      className="btn-primary disabled:opacity-50"
                    >
                      {csvSaving ? 'Saving…' : fixRevMode
                        ? `Fix Revenue for ${csvDate} (no inventory change)`
                        : `Import ${csvRows.length} Items & Deduct Inventory`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {msg && <p className={`text-sm mb-4 ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}

          {/* Log form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow border border-gray-100 p-5 mb-8">
            <div className="flex items-center gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="border p-2 rounded text-sm"
                />
              </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 px-1 mb-2">
              <div className="col-span-8 md:col-span-9">Product</div>
              <div className="col-span-3">Qty Sold</div>
              <div className="col-span-1"></div>
            </div>

            <div className="space-y-2 mb-3">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-8 md:col-span-9">
                    <select
                      value={item.productName}
                      onChange={e => updateItem(i, 'productName', e.target.value)}
                      className="w-full border p-2 rounded text-sm"
                      required
                    >
                      <option value="">Select product…</option>
                      {products.map(p => (
                        <option key={p._id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', e.target.value)}
                      className="w-full border p-2 rounded text-sm text-center"
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-red-400 hover:text-red-600 w-8 h-8 text-base"
                      >✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addItem} className="text-sm text-primary underline mb-5">
              + Add Product
            </button>

            <div className="mb-5">
              <label className="block text-xs font-semibold mb-1">Notes (optional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full border p-2 rounded text-sm"
                placeholder="e.g. Saturday rush, catering order, slow day…"
              />
            </div>

            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50 w-full md:w-auto">
              {saving ? 'Logging…' : 'Log Sales & Deduct Inventory'}
            </button>
          </form>

          {/* Past logs */}
          <h2 className="text-xl font-bold mb-3">Past Logs</h2>
          {logs.length === 0 ? (
            <p className="text-gray-400 text-sm">No walk-in logs yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log._id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        {new Date(log.date).toLocaleDateString('en-US', {
                          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                          timeZone: 'UTC',
                        })}
                        <span className="ml-2 text-xs text-gray-400 font-normal">
                          {totalQty(log)} total sold
                        </span>
                        {log.source === 'csv_import' && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">CSV</span>
                        )}
                        {log.inventoryDeducted
                          ? <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ Inventory deducted</span>
                          : <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">⚠ Not deducted</span>
                        }
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                        {log.items.map((item, i) => (
                          <p key={i} className="text-sm text-gray-600">
                            <span className="font-medium">{item.quantity}×</span> {item.productName}
                          </p>
                        ))}
                      </div>
                      {log.note && <p className="text-xs text-gray-400 mt-1 italic">{log.note}</p>}

                      {/* Revenue display / inline edit */}
                      {editRevId === log._id ? (
                        <div className="mt-3 flex flex-wrap gap-3 items-end">
                          {[['grossSales','Gross Sales'],['netSales','Net Sales'],['discounts','Discounts']].map(([field, label]) => (
                            <div key={field}>
                              <label className="block text-xs font-semibold mb-1">{label} ($)</label>
                              <input
                                type="number" min="0" step="0.01"
                                value={editRevForm[field]}
                                onChange={e => setEditRevForm(f => ({ ...f, [field]: e.target.value }))}
                                className="border rounded px-2 py-1 text-sm w-28"
                              />
                            </div>
                          ))}
                          <button
                            disabled={editRevSaving}
                            onClick={async () => {
                              setEditRevSaving(true);
                              const res = await fetch('/api/admin/walkin', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: log._id, ...editRevForm }),
                              });
                              if (res.ok) { fetchLogs(); setEditRevId(null); }
                              setEditRevSaving(false);
                            }}
                            className="btn-primary text-sm disabled:opacity-50"
                          >{editRevSaving ? 'Saving…' : 'Save'}</button>
                          <button onClick={() => setEditRevId(null)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500 items-center">
                          <span>Gross: <strong className="text-gray-700">${(log.grossSales || 0).toFixed(2)}</strong></span>
                          <span>Net: <strong className={log.netSales > 0 ? 'text-green-600' : 'text-red-500'}>${(log.netSales || 0).toFixed(2)}</strong></span>
                          {log.discounts > 0 && <span>Discounts: <strong>${log.discounts.toFixed(2)}</strong></span>}
                          <button
                            onClick={() => {
                              setEditRevId(log._id);
                              setEditRevForm({ grossSales: (log.grossSales || 0).toString(), netSales: (log.netSales || 0).toString(), discounts: (log.discounts || 0).toString() });
                            }}
                            className="text-blue-500 hover:text-blue-700 underline"
                          >{log.netSales > 0 ? 'Edit Revenue' : '⚠ Fix Revenue'}</button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        disabled={deductingId === log._id}
                        onClick={async () => {
                          if (!confirm('This will deduct inventory for all items in this log.\n\nOnly run this if inventory was NOT already deducted for this log.')) return;
                          setDeductingId(log._id);
                          const res = await fetch('/api/admin/walkin', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: log._id }),
                          });
                          const data = await res.json();
                          setDeductingId(null);
                          setDeductMsg(m => ({ ...m, [log._id]: res.ok ? `✓ Deducted ${data.deductions} ingredient(s)` : `Error: ${data.error}` }));
                          setTimeout(() => setDeductMsg(m => { const n = { ...m }; delete n[log._id]; return n; }), 5000);
                        }}
                        className="text-xs text-purple-500 hover:text-purple-700 underline disabled:opacity-50"
                      >{deductingId === log._id ? 'Running…' : 'Run Deduction'}</button>
                      {deductMsg[log._id] && (
                        <span className="text-xs text-green-600">{deductMsg[log._id]}</span>
                      )}
                      <button
                        onClick={() => handleDelete(log._id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
