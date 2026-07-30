'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

export default function MarketingAutomationPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function loadData() {
    try {
      const response = await fetch('/api/admin/customer-marketing-automation');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to load automation data');
      setLogs(payload.logs || []);
      setSummary(payload.summary || []);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    }
  }

  async function runAutomation() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/admin/customer-marketing-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to run automation');
      setResult(payload);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to run automation');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Marketing Automation</h1>
              <p className="text-gray-600 mt-2">Run abandoned cart, review request, and win-back campaigns from one place.</p>
            </div>
            <button
              onClick={runAutomation}
              disabled={loading}
              className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 disabled:opacity-60"
            >
              {loading ? 'Running…' : 'Run Automations'}
            </button>
          </div>

          {error ? <div className="bg-red-50 text-red-700 p-3 rounded mb-6">{error}</div> : null}

          {result ? (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg mb-6">
              <div className="font-semibold mb-2">Automation run completed</div>
              <div className="text-sm">Abandoned cart: {result.abandonedCart?.sent || 0} sent / {result.abandonedCart?.attempted || 0} attempted</div>
              <div className="text-sm">Review requests: {result.postPurchaseReview?.sent || 0} sent / {result.postPurchaseReview?.attempted || 0} attempted</div>
              <div className="text-sm">Win-back: {result.winBack?.sent || 0} sent / {result.winBack?.attempted || 0} attempted</div>
            </div>
          ) : null}

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold mb-3">Recent automation counts</h2>
              {summary.length === 0 ? <p className="text-gray-500 text-sm">No logs yet.</p> : (
                <ul className="space-y-2 text-sm">
                  {summary.map(item => (
                    <li key={item._id} className="flex justify-between">
                      <span className="capitalize">{item._id.replace(/_/g, ' ')}</span>
                      <span className="font-semibold">{item.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold mb-3">What this automates</h2>
              <ul className="text-sm text-gray-600 space-y-2 list-disc ml-5">
                <li>Abandoned cart recovery for incomplete checkouts</li>
                <li>Post-purchase Google review requests</li>
                <li>Win-back emails for customers who haven’t ordered recently</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold">Recent automation log</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Sent</th>
                    <th className="px-5 py-3">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-gray-500">No automation events yet.</td>
                    </tr>
                  ) : logs.map(log => (
                    <tr key={log._id} className="border-t">
                      <td className="px-5 py-3 capitalize">{(log.type || '').replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3">{log.customerEmail || '—'}</td>
                      <td className="px-5 py-3">{new Date(log.sentAt || Date.now()).toLocaleString()}</td>
                      <td className="px-5 py-3 text-gray-600">{JSON.stringify(log.context || {})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
