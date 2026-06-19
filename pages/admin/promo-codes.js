'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

const emptyForm = { code: '', description: '', type: 'percentage', value: '', minOrderAmount: '', maxUses: '', expiresAt: '' };

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchCodes = async () => {
    const res = await fetch('/api/admin/promo-codes');
    if (res.ok) setCodes(await res.json());
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const res = await fetch('/api/admin/promo-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('✓ Code created!');
      setForm(emptyForm);
      fetchCodes();
    } else {
      setMessage(`Error: ${data.error}`);
    }
    setLoading(false);
  };

  const handleToggle = async (code) => {
    await fetch('/api/admin/promo-codes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: code._id, isActive: !code.isActive }),
    });
    fetchCodes();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this code?')) return;
    await fetch('/api/admin/promo-codes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setCodes(c => c.filter(x => x._id !== id));
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-5xl mx-auto p-8">
          <h1 className="text-2xl font-bold mb-6">Promo / Coupon Codes</h1>

          {/* Create form */}
          <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="font-bold mb-4">Create New Code</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Code *</label>
                <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full border p-2 rounded text-sm uppercase" placeholder="SAVE10" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border p-2 rounded text-sm">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Value *</label>
                <input type="number" min="0" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder={form.type === 'percentage' ? '10' : '5.00'} required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Min Order ($)</label>
                <input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Max Uses</label>
                <input type="number" min="1" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="Unlimited" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Expires At</label>
                <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="w-full border p-2 rounded text-sm" />
              </div>
              <div className="col-span-2 md:col-span-3">
                <label className="block text-xs font-semibold mb-1">Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="e.g. 10% off for returning customers" />
              </div>
            </div>
            {message && <p className={`text-sm mb-3 ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">{loading ? 'Creating...' : 'Create Code'}</button>
          </form>

          {/* Codes table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-semibold">Code</th>
                  <th className="text-left p-3 font-semibold">Discount</th>
                  <th className="text-left p-3 font-semibold">Uses</th>
                  <th className="text-left p-3 font-semibold">Expires</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {codes.map(c => (
                  <tr key={c._id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono font-bold">{c.code}</td>
                    <td className="p-3">{c.type === 'percentage' ? `${c.value}%` : `$${c.value}`}{c.minOrderAmount > 0 ? ` (min $${c.minOrderAmount})` : ''}</td>
                    <td className="p-3 text-gray-500">{c.usedCount} / {c.maxUses ?? '∞'}</td>
                    <td className="p-3 text-gray-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</td>
                    <td className="p-3">
                      <button onClick={() => handleToggle(c)} className={`text-xs px-2 py-1 rounded-full font-semibold ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDelete(c._id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
                {codes.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No codes yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
