'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

const API_SECRET = process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '';

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

export default function AdminPaymentRecordsPage() {
  const [employees, setEmployees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');

  const [form, setForm] = useState({
    employeeName: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    totalHours: '',
    gross: '',
    note: '',
  });

  const [statusDrafts, setStatusDrafts] = useState({});

  async function fetchEmployees() {
    const res = await fetch('/api/admin/employees', {
      headers: { 'x-employee-secret': API_SECRET },
    });
    if (!res.ok) throw new Error('Failed to fetch employees');
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
  }

  async function fetchPayments() {
    const res = await fetch('/api/admin/payments', {
      headers: { 'x-employee-secret': API_SECRET },
    });
    if (!res.ok) throw new Error('Failed to fetch payment records');
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setPayments(list);

    const drafts = {};
    for (const p of list) drafts[p._id] = p.status || 'pending';
    setStatusDrafts(drafts);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([fetchEmployees(), fetchPayments()]);
      } catch (err) {
        setMsg(err.message || 'Failed to load page data');
        setMsgType('error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function createManualPayment(e) {
    e.preventDefault();
    setMsg('');

    if (!form.employeeName.trim() || !form.paymentDate) {
      setMsg('Employee name and payment date are required.');
      setMsgType('error');
      return;
    }

    setCreating(true);
    try {
      const paidHours = Number(form.totalHours || 0);
      const gross = Number(form.gross || 0);
      const employeeByName = employees.find(
        (e) => String(e.name || '').toLowerCase() === String(form.employeeName || '').trim().toLowerCase()
      );

      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-secret': API_SECRET,
        },
        body: JSON.stringify({
          employeeId: employeeByName?._id || null,
          employeeName: form.employeeName.trim(),
          paymentDate: new Date(form.paymentDate).toISOString(),
          paidHours,
          totalHours: paidHours,
          hours: paidHours,
          gross,
          note: form.note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment record');

      setMsg('Manual payment record created.');
      setMsgType('success');
      setForm({ employeeName: '', paymentDate: new Date().toISOString().slice(0, 10), totalHours: '', gross: '', note: '' });
      await fetchPayments();
    } catch (err) {
      setMsg(err.message || 'Failed to create payment record');
      setMsgType('error');
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(paymentId) {
    const nextStatus = statusDrafts[paymentId] || 'pending';
    setUpdatingId(paymentId);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-secret': API_SECRET,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setPayments((prev) => prev.map((p) => (p._id === data._id ? data : p)));
      setMsg('Payment status updated.');
      setMsgType('success');
    } catch (err) {
      setMsg(err.message || 'Failed to update status');
      setMsgType('error');
    } finally {
      setUpdatingId('');
    }
  }

  const totalGross = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.gross || 0), 0),
    [payments]
  );

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-6xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-2">Payment Records</h1>
          <p className="text-gray-600 mb-8">Track payments and add manual entries when needed.</p>

          {msg && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                msgType === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {msg}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Manual Payment Entry</h2>
            <form onSubmit={createManualPayment} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                <input
                  type="text"
                  list="employee-names"
                  placeholder="Enter employee name"
                  value={form.employeeName}
                  onChange={(e) => setForm((prev) => ({ ...prev, employeeName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
                <datalist id="employee-names">
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Payment</label>
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Hours</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={form.totalHours}
                  onChange={(e) => setForm((prev) => ({ ...prev, totalHours: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount of Payment ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.gross}
                  onChange={(e) => setForm((prev) => ({ ...prev, gross: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <input
                  type="text"
                  placeholder="Optional note"
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="md:col-span-6">
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition"
                >
                  {creating ? 'Saving...' : 'Add Payment'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Payment Records ({payments.length})</h2>
              <div className="text-sm text-gray-700 font-medium">Total Gross: ${round2(totalGross).toFixed(2)}</div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-gray-500">Loading payment records...</div>
            ) : payments.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No payment records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date of Payment</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total Hours</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Note</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.employee?.name || p.employeeName || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{round2(p.totalHours ?? p.paidHours ?? p.hours).toFixed(2)} hrs</td>
                        <td className="px-6 py-4 text-sm font-bold text-green-700">${round2(p.gross).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{p.note || '—'}</td>
                        <td className="px-6 py-4 text-sm">
                          <select
                            value={statusDrafts[p._id] || p.status || 'pending'}
                            onChange={(e) => setStatusDrafts((prev) => ({ ...prev, [p._id]: e.target.value }))}
                            className="border border-gray-300 rounded-lg px-2 py-1"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            type="button"
                            onClick={() => updateStatus(p._id)}
                            disabled={updatingId === p._id}
                            className="bg-slate-100 hover:bg-slate-200 disabled:bg-gray-100 text-slate-700 px-3 py-1 rounded text-xs"
                          >
                            {updatingId === p._id ? 'Saving...' : 'Save'}
                          </button>
                        </td>
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
