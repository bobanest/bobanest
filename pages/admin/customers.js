'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', points: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/customers');
      const data = await response.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage('Failed to load customers.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (email) => {
    setSelected(email);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/customers?email=${encodeURIComponent(email)}`);
      setDetail(await res.json());
    } finally {
      setLoadingDetail(false);
    }
  };

  const saveCustomer = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!form.name.trim() || !form.email.trim()) {
      setMessage('Name and email are required.');
      setMessageType('error');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          points: Number(form.points) || 0,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save customer');
      }

      setMessage('Customer saved successfully.');
      setMessageType('success');
      setForm({ name: '', email: '', points: 0 });
      await fetchCustomers();
      await loadDetail(data.email);
    } catch (error) {
      setMessage(error.message || 'Failed to save customer.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter(c =>
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const tierColor = (pts) => pts >= 1000 ? 'text-yellow-500' : pts >= 500 ? 'text-gray-400' : 'text-orange-400';
  const tier = (pts) => pts >= 1000 ? '🥇 Gold' : pts >= 500 ? '🥈 Silver' : '🥉 Bronze';

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Customer Management</h1>
          <p className="text-gray-500 mb-6">{customers.length} customers</p>

          {message && (
            <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${messageType === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold">Add Customer Manually</h2>
                <p className="text-sm text-gray-500">Create a customer record for loyalty points and future order tracking.</p>
              </div>
            </div>

            <form onSubmit={saveCustomer} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sarah Johnson"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="customer@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Starting Points</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-5 py-2 rounded-lg transition"
                >
                  {saving ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>

          <div className="flex gap-6">
            {/* Customer list */}
            <div className="w-1/2">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border p-2 rounded mb-3 text-sm"
              />
              {loading ? <p className="text-gray-400">Loading...</p> : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3">Customer</th>
                        <th className="text-right p-3">Orders</th>
                        <th className="text-right p-3">Spent</th>
                        <th className="text-right p-3">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(c => (
                        <tr
                          key={c._id}
                          className={`border-t cursor-pointer hover:bg-gray-50 ${selected === c.email ? 'bg-primary/5' : ''}`}
                          onClick={() => loadDetail(c.email)}
                        >
                          <td className="p-3">
                            <p className="font-medium">{c.name || '—'}</p>
                            <p className="text-xs text-gray-400">{c.email}</p>
                          </td>
                          <td className="p-3 text-right text-gray-600">{c.orderCount}</td>
                          <td className="p-3 text-right font-semibold text-green-600">${(c.totalSpent || 0).toFixed(2)}</td>
                          <td className={`p-3 text-right font-semibold ${tierColor(c.points)}`}>{c.points}</td>
                        </tr>
                      ))}
                      {filtered.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-gray-400">No customers found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Customer detail */}
            <div className="w-1/2">
              {!selected ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
                  <p className="text-4xl mb-2">👤</p>
                  <p>Select a customer to view details</p>
                </div>
              ) : loadingDetail ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">Loading...</div>
              ) : detail ? (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b">
                    <p className="font-bold text-lg">{detail.customer.name || detail.customer.email}</p>
                    <p className="text-sm text-gray-500">{detail.customer.email}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className={`font-semibold ${tierColor(detail.customer.points)}`}>{tier(detail.customer.points)}</span>
                      <span className="text-gray-600">{detail.customer.points} pts</span>
                      <span className="text-green-600 font-semibold">Total: ${detail.totalSpent.toFixed(2)}</span>
                    </div>
                    {detail.customer.referralCode && (
                      <p className="text-xs text-gray-400 mt-1">Referral: {detail.customer.referralCode}</p>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-3">Order History ({detail.orders.length})</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {detail.orders.map(o => (
                        <div key={o._id} className={`border rounded p-3 text-xs ${o.paymentStatus === 'paid' ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                          <div className="flex justify-between mb-1">
                            <span className="font-bold">#{o.trackingNumber}</span>
                            <span className="font-semibold text-green-700">${(o.totalAmount || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-500">
                            <span>{o.items?.map(i => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}</span>
                            <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-2 mt-1">
                            <span className={`px-1 rounded ${o.paymentStatus === 'paid' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{o.paymentStatus}</span>
                            <span className="bg-gray-200 text-gray-600 px-1 rounded capitalize">{o.status}</span>
                            <span className="bg-gray-200 text-gray-600 px-1 rounded">{o.orderType}</span>
                          </div>
                        </div>
                      ))}
                      {detail.orders.length === 0 && <p className="text-gray-400">No orders yet.</p>}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
