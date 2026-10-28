'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function AdminSalesReports() {
  const [reports, setReports] = useState([]);
  const [locations, setLocations] = useState([]);
  const [open, setOpen] = useState('');

  async function load() {
    const r = await fetch('/api/admin/sales-reports');
    if (r.ok) setReports(await r.json());
  }

  useEffect(() => {
    load();
    fetch('/api/locations').then((r) => r.json()).then((d) => setLocations(Array.isArray(d) ? d : d.locations || [])).catch(() => {});
  }, []);

  async function update(id, patch) {
    await fetch('/api/admin/sales-reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) });
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this report?')) return;
    await fetch(`/api/admin/sales-reports?id=${id}`, { method: 'DELETE' });
    load();
  }

  const storeName = (slug, tag) => locations.find((l) => l.slug === slug)?.name || (tag ? `Unmatched (${tag})` : 'Unknown');

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-5xl mx-auto p-4 space-y-4">
          <h1 className="text-2xl font-bold">Daily Sales Reports</h1>
          <p className="text-sm text-gray-600">Imported automatically from the Shift4 emails. Fix the date or store here if the import guessed wrong.</p>
          <div className="bg-white border rounded-xl divide-y">
            {!reports.length && <p className="p-4 text-sm text-gray-500">No reports received yet.</p>}
            {reports.map((r) => (
              <div key={r._id} className="p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="date" defaultValue={r.reportDate} onBlur={(e) => e.target.value && e.target.value !== r.reportDate && update(r._id, { reportDate: e.target.value })} className="border rounded px-2 py-1" />
                    <select value={r.location} onChange={(e) => update(r._id, { location: e.target.value })} className="border rounded px-2 py-1">
                      <option value="">{storeName('', r.locationTag)}</option>
                      {locations.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>{r.totals?.qty} items · <strong>{money(r.totals?.netSales)}</strong> net</span>
                    <button onClick={() => setOpen(open === r._id ? '' : r._id)} className="text-purple-700 underline">{open === r._id ? 'Hide' : 'Details'}</button>
                    <button onClick={() => remove(r._id)} className="text-red-600">Delete</button>
                  </div>
                </div>
                {open === r._id && (
                  <table className="w-full mt-3 text-left">
                    <thead className="text-gray-500"><tr><th>Item</th><th>Dept</th><th className="text-right">Qty</th><th className="text-right">Net</th></tr></thead>
                    <tbody>
                      {r.items.map((i, k) => (
                        <tr key={k} className="border-t"><td>{i.item}</td><td>{i.department}</td><td className="text-right">{i.qty}</td><td className="text-right">{money(i.netSales)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
