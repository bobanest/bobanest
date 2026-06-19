'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

export default function AdminPush() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/products');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');
  const [errors, setErrors] = useState([]);
  const [subCount, setSubCount] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    fetch('/api/push/count').then(r => r.ok ? r.json() : null).then(d => d && setSubCount(d.count)).catch(() => {});
  }, []);

  const loadDebug = async () => {
    const res = await fetch('/api/admin/push/debug');
    if (res.ok) setDebugInfo(await res.json());
  };
  const handleSend = async (e) => {
    e.preventDefault();
    if (!confirm(`Send push notification to all subscribers?`)) return;
    setSending(true);
    setResult('');
    setErrors([]);
    try {
      const res = await fetch('/api/admin/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`✓ Sent to ${data.sent} of ${data.total} subscriber(s).${data.failed > 0 ? ` ${data.failed} failed.` : ''}`);
        if (data.errors?.length) setErrors(data.errors);
        if (data.sent > 0) { setTitle(''); setBody(''); }
        // refresh count
        fetch('/api/push/count').then(r => r.ok ? r.json() : null).then(d => d && setSubCount(d.count)).catch(() => {});
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch {
      setResult('Failed to send notifications.');
    } finally {
      setSending(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-2xl mx-auto p-8">
          <div className="flex items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Push Notifications</h1>
              {subCount !== null && (
                <p className="text-gray-500">{subCount} active subscriber{subCount !== 1 ? 's' : ''}</p>
              )}
            </div>
            <button onClick={loadDebug} className="ml-auto text-xs text-gray-400 underline">Debug subscribers</button>
          </div>

          {debugInfo && (
            <div className="bg-gray-50 border rounded-lg p-4 mb-6 text-xs font-mono">
              <p className="font-bold mb-2">DB has {debugInfo.count} subscriber(s):</p>
              {debugInfo.subscribers.map((s, i) => (
                <div key={i} className="mb-1 text-gray-700">
                  #{i+1} …{s.endpointEnd} | p256dh:{s.hasP256dh ? '✓' : '✗'} auth:{s.hasAuth ? '✓' : '✗'} | {s.email || 'no email'} | {new Date(s.createdAt).toLocaleString()}
                </div>
              ))}
              {debugInfo.subscribers.length === 0 && <p className="text-red-600">No subscriptions found in DB — subscriber may not have saved correctly.</p>}
            </div>
          )}

          <form onSubmit={handleSend} className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-2 rounded" placeholder="New flavor alert! 🧋" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Message *</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} className="w-full border p-2 rounded" placeholder="Check out our new Taro Lychee boba — limited time only!" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Link URL</label>
              <input type="text" value={url} onChange={e => setUrl(e.target.value)} className="w-full border p-2 rounded" placeholder="/products" />
            </div>
            {result && <p className={`text-sm ${result.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{result}</p>}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">
                <p className="font-semibold mb-1">Send errors:</p>
                {errors.map((e, i) => <p key={i}>…{e.endpoint}: HTTP {e.statusCode} — {e.message}</p>)}
              </div>
            )}
            <button type="submit" disabled={sending} className="btn-primary disabled:opacity-50 w-full">
              {sending ? 'Sending...' : 'Send Notification to All Subscribers'}
            </button>
          </form>

          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <p className="font-semibold mb-1">How subscribers opt in:</p>
            <p>Customers are prompted to allow push notifications when they visit the site. They can also subscribe/unsubscribe from their browser settings at any time.</p>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
