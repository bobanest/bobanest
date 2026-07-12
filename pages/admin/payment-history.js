'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

const API_SECRET = process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '';

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

export default function AdminPaymentHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [msg, setMsg] = useState('');

  async function fetchHistory() {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/payments/history', {
        headers: { 'x-employee-secret': API_SECRET },
      });
      if (!res.ok) throw new Error('Failed to fetch payment history');
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setMsg(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter((row) => {
      const employeeName = String(row.employee?.name || '').toLowerCase();
      const employeeOk = employeeFilter ? employeeName.includes(employeeFilter.toLowerCase()) : true;
      const actionOk = actionFilter ? row.action === actionFilter : true;
      return employeeOk && actionOk;
    });
  }, [history, employeeFilter, actionFilter]);

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-6xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-2">Payment History Ledger</h1>
          <p className="text-gray-600 mb-8">Review every payment creation and status update in one timeline.</p>

          {msg && (
            <div className="p-4 rounded-lg mb-6 bg-red-50 border border-red-200 text-red-700">
              {msg}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Search</label>
                <input
                  type="text"
                  placeholder="Search by employee name"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">All Actions</option>
                  <option value="created">Created</option>
                  <option value="status_changed">Status Changed</option>
                </select>
              </div>
              <div className="text-sm text-gray-700 font-medium">Records: {filteredHistory.length}</div>
              <div>
                <button
                  type="button"
                  onClick={fetchHistory}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-4 py-2 rounded-lg transition"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-gray-500">Loading payment history...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No payment history records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">When</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status Change</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Period</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Gross</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredHistory.map((row) => (
                      <tr key={row._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-700">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.employee?.name || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {row.action === 'created' ? 'Created' : 'Status Changed'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {row.previousStatus ? `${row.previousStatus} -> ${row.newStatus}` : row.newStatus}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {new Date(row.periodStart).toLocaleDateString()} - {new Date(row.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-700">${round2(row.gross).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{row.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
