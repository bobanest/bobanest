'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

const blank = { _id: '', title: '', category: 'General', order: 0, locations: [], body: '' };

export default function AdminGuides() {
  const [guides, setGuides] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await fetch('/api/admin/guides');
    if (r.ok) { const d = await r.json(); setGuides(Array.isArray(d) ? d : d.guides || []); }
  }

  useEffect(() => {
    load();
    fetch('/api/locations').then((r) => r.json()).then((d) => setLocations(Array.isArray(d) ? d : d.locations || [])).catch(() => {});
  }, []);

  async function seed() {
    const r = await fetch('/api/admin/guides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seed' }) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? 'Starter guides loaded.' : d.error || 'Failed');
    load();
  }

  async function save(e) {
    e.preventDefault();
    const r = await fetch('/api/admin/guides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: form._id || undefined }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg(d.error || 'Failed');
    setForm(null); setMsg('Saved.'); load();
  }

  async function remove(id) {
    if (!confirm('Delete this guide?')) return;
    await fetch(`/api/admin/guides?id=${id}`, { method: 'DELETE' });
    load();
  }

  function toggle(slug) {
    const has = form.locations.includes(slug);
    setForm({ ...form, locations: has ? form.locations.filter((s) => s !== slug) : [...form.locations, slug] });
  }

  const names = (g) => (g.locations?.length ? g.locations.join(', ') : 'All stores');

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Staff Guides</h1>
            <div className="flex gap-2">
              {!guides.length && <button onClick={seed} className="border rounded px-3 py-2">Load starter guides</button>}
              <button onClick={() => setForm({ ...blank })} className="bg-purple-600 text-white rounded px-4 py-2">New guide</button>
            </div>
          </div>
          {msg && <p className="text-sm text-gray-600">{msg}</p>}

          {form && (
            <form onSubmit={save} className="bg-white border rounded-xl p-4 space-y-3">
              <input className="w-full border rounded px-3 py-2" placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="flex gap-2">
                <input className="flex-1 border rounded px-3 py-2" placeholder="Category (e.g. Drinks, Store, POS)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <input className="w-24 border rounded px-3 py-2" type="number" title="Order" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Stores (none checked = all stores): </span>
                {locations.map((l) => (
                  <label key={l.slug} className="mr-3"><input type="checkbox" checked={form.locations.includes(l.slug)} onChange={() => toggle(l.slug)} /> {l.name}</label>
                ))}
              </div>
              <textarea className="w-full border rounded px-3 py-2 font-mono text-sm" rows={14} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              <p className="text-xs text-gray-500"># Heading · - bullet · 1. numbered step · blank line = new paragraph</p>
              <div className="flex gap-2">
                <button className="bg-purple-600 text-white rounded px-4 py-2">Save</button>
                <button type="button" onClick={() => setForm(null)} className="border rounded px-4 py-2">Cancel</button>
              </div>
            </form>
          )}

          <div className="bg-white border rounded-xl">
            {!guides.length && <p className="p-4 text-sm text-gray-500">No guides yet. Load the starter guides to begin.</p>}
            {guides.map((g) => (
              <div key={g._id} className="flex justify-between items-center border-b last:border-0 p-3 text-sm">
                <div><strong>{g.title}</strong><div className="text-gray-500">{g.category} · {names(g)}</div></div>
                <div className="flex gap-3">
                  <button onClick={() => setForm({ ...blank, ...g })} className="text-purple-700 underline">Edit</button>
                  <button onClick={() => remove(g._id)} className="text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
