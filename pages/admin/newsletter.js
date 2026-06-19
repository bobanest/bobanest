'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

export default function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscribers = async () => {
    setLoading(true);
    const res = await fetch('/api/newsletter');
    if (res.ok) setSubscribers(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const handleRemove = async (email) => {
    if (!confirm(`Unsubscribe ${email}?`)) return;
    await fetch('/api/newsletter', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setSubscribers(s => s.filter(x => x.email !== email));
  };

  const handleExportCSV = () => {
    const csv = ['Email,Name,Subscribed At', ...subscribers.map(s => `${s.email},${s.name || ''},${new Date(s.subscribedAt).toLocaleDateString()}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'newsletter-subscribers.csv';
    a.click();
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold">Newsletter Subscribers</h1>
              <p className="text-gray-500">{subscribers.length} active subscriber{subscribers.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={handleExportCSV} className="bg-primary text-white px-4 py-2 rounded font-semibold text-sm">
              Export CSV
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No subscribers yet.</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-semibold">Email</th>
                    <th className="text-left p-3 font-semibold">Name</th>
                    <th className="text-left p-3 font-semibold">Subscribed</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map(s => (
                    <tr key={s._id} className="border-t hover:bg-gray-50">
                      <td className="p-3">{s.email}</td>
                      <td className="p-3 text-gray-500">{s.name || '—'}</td>
                      <td className="p-3 text-gray-500">{new Date(s.subscribedAt).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleRemove(s.email)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
