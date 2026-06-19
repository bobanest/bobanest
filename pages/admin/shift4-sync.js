'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

export default function Shift4Sync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSyncHistory();
  }, []);

  const loadSyncHistory = async () => {
    try {
      const res = await fetch('/api/admin/walkin?source=shift4&limit=10');
      if (res.ok) {
        const data = await res.json();
        setSyncHistory(data);
        if (data.length > 0) {
          setLastSync(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load sync history:', error);
    }
  };

  const handleSync = async (date = null) => {
    setSyncing(true);
    setMessage('');

    try {
      const syncDate = date || selectedDate;
      const res = await fetch(`/api/admin/shift4-sync?date=${syncDate}`, {
        method: 'POST'
      });

      const data = await res.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        loadSyncHistory();
      } else {
        setMessage(`❌ Sync failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    handleSync(yesterday.toISOString().slice(0, 10));
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Shift4 Sales Sync</h1>
              <p className="text-gray-500 text-sm mt-1">Automatically import daily sales from Shift4 payment processor</p>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-lg mb-6 ${message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Manual Sync */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Manual Sync</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSync()}
                    disabled={syncing}
                    className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing ? 'Syncing...' : 'Sync Selected Date'}
                  </button>
                  <button
                    onClick={handleSyncYesterday}
                    disabled={syncing}
                    className="bg-secondary text-white px-4 py-2 rounded-lg font-medium hover:bg-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sync Yesterday
                  </button>
                </div>
              </div>
            </div>

            {/* Last Sync Status */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Sync Status</h2>
              {lastSync ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Sync:</span>
                    <span className="font-medium">{new Date(lastSync.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Transactions:</span>
                    <span className="font-medium">{lastSync.items?.[0]?.quantity || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Sales:</span>
                    <span className="font-medium text-green-600">${(lastSync.grossSales || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded">
                    {lastSync.notes}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No sync history found</p>
              )}
            </div>
          </div>

          {/* Sync History */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Recent Syncs</h2>
            {syncHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-gray-700">Date</th>
                      <th className="text-left py-2 font-medium text-gray-700">Transactions</th>
                      <th className="text-left py-2 font-medium text-gray-700">Total Sales</th>
                      <th className="text-left py-2 font-medium text-gray-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncHistory.map((sync) => (
                      <tr key={sync._id} className="border-b border-gray-100">
                        <td className="py-3">{new Date(sync.date).toLocaleDateString()}</td>
                        <td className="py-3">{sync.items?.[0]?.quantity || 0}</td>
                        <td className="py-3 text-green-600 font-medium">${(sync.grossSales || 0).toFixed(2)}</td>
                        <td className="py-3 text-gray-600 text-xs max-w-xs truncate">{sync.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No sync history available</p>
            )}
          </div>

          {/* Setup Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
            <h3 className="text-lg font-bold text-blue-800 mb-3">Setup & Automation</h3>
            <div className="space-y-2 text-sm text-blue-700">
              <p><strong>Environment Variables:</strong> SHIFT4_SECRET_KEY is configured</p>
              <p><strong>Daily Sync:</strong> Runs automatically at 11:59 PM via Vercel cron</p>
              <p><strong>Data Source:</strong> Pulls completed transactions from Shift4 API</p>
              <p><strong>Storage:</strong> Creates WalkInLog entries with source='shift4'</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}