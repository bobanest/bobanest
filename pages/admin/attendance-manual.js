'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

const API_SECRET = process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '';

function toDatetimeLocalInput(value) {
  const d = new Date(value || Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminAttendanceManualPage() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');

  const [manualForm, setManualForm] = useState({
    employeeId: '',
    type: 'login',
    timestamp: toDatetimeLocalInput(),
  });

  const [editForm, setEditForm] = useState({
    employeeId: '',
    type: 'login',
    timestamp: toDatetimeLocalInput(),
  });

  async function fetchEmployees() {
    const res = await fetch('/api/admin/employees', {
      headers: { 'x-employee-secret': API_SECRET },
    });
    if (!res.ok) throw new Error('Failed to fetch employees');
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
  }

  async function fetchAttendance() {
    const res = await fetch('/api/admin/attendance', {
      headers: { 'x-employee-secret': API_SECRET },
    });
    if (!res.ok) throw new Error('Failed to fetch attendance');
    const data = await res.json();
    setAttendance(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([fetchEmployees(), fetchAttendance()]);
      } catch (err) {
        setMsg(err.message || 'Failed to load data');
        setMsgType('error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function addManualAttendance(e) {
    e.preventDefault();
    setMsg('');
    if (!manualForm.employeeId || !manualForm.timestamp) {
      setMsg('Please select employee and time');
      setMsgType('error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-secret': API_SECRET,
        },
        body: JSON.stringify({
          employeeId: manualForm.employeeId,
          type: manualForm.type,
          timestamp: new Date(manualForm.timestamp).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add record');

      setAttendance((prev) => [data, ...prev]);
      setMsg('Manual clock record added.');
      setMsgType('success');
    } catch (err) {
      setMsg(err.message || 'Failed to add record');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    setEditingAttendanceId(row._id);
    setEditForm({
      employeeId: row.employee?._id || '',
      type: row.type || 'login',
      timestamp: toDatetimeLocalInput(row.timestamp),
    });
    setMsg('');
  }

  function cancelEdit() {
    setEditingAttendanceId('');
  }

  async function saveEdit() {
    if (!editingAttendanceId) return;
    if (!editForm.employeeId || !editForm.type || !editForm.timestamp) {
      setMsg('Please fill employee, type, and time.');
      setMsgType('error');
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-secret': API_SECRET,
        },
        body: JSON.stringify({
          id: editingAttendanceId,
          employeeId: editForm.employeeId,
          type: editForm.type,
          timestamp: new Date(editForm.timestamp).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update record');

      setAttendance((prev) => prev.map((r) => (r._id === data._id ? data : r)));
      setMsg('Clock record updated.');
      setMsgType('success');
      cancelEdit();
    } catch (err) {
      setMsg(err.message || 'Failed to update record');
      setMsgType('error');
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-6xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-2">Manual Clock In/Out Entry</h1>
          <p className="text-gray-600 mb-8">Add missed clock records and correct mistakes in one place.</p>

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
            <h2 className="text-xl font-bold mb-4">Add Manual Clock Record</h2>
            <form onSubmit={addManualAttendance} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={manualForm.employeeId}
                  onChange={(e) => setManualForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.assignedId || 'No ID'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={manualForm.type}
                  onChange={(e) => setManualForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  <option value="login">Clock In</option>
                  <option value="logout">Clock Out</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="datetime-local"
                  value={manualForm.timestamp}
                  onChange={(e) => setManualForm((prev) => ({ ...prev, timestamp: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition"
              >
                {saving ? 'Saving...' : 'Add Record'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Clock Records ({attendance.length})</h2>
              <button
                type="button"
                onClick={fetchAttendance}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-4 py-2 rounded-lg transition"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-10 text-center text-gray-500">Loading records...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Paid</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendance.map((row) => (
                      <tr key={row._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {editingAttendanceId === row._id ? (
                            <select
                              value={editForm.employeeId}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                              className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                            >
                              {employees.map((emp) => (
                                <option key={emp._id} value={emp._id}>{emp.name}</option>
                              ))}
                            </select>
                          ) : (
                            row.employee?.name || 'Unknown'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {editingAttendanceId === row._id
                            ? (employees.find((emp) => emp._id === editForm.employeeId)?.assignedId || '—')
                            : (row.employee?.assignedId || '—')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingAttendanceId === row._id ? (
                            <select
                              value={editForm.type}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                              className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                            >
                              <option value="login">Clock In</option>
                              <option value="logout">Clock Out</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                row.type === 'login' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {row.type === 'login' ? 'Clock In' : 'Clock Out'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {editingAttendanceId === row._id ? (
                            <input
                              type="datetime-local"
                              value={editForm.timestamp}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, timestamp: e.target.value }))}
                              className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                            />
                          ) : (
                            new Date(row.timestamp).toLocaleString()
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              row.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {row.isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingAttendanceId === row._id ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={editSaving}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs"
                              >
                                {editSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={row.isPaid}
                              onClick={() => startEdit(row)}
                              className="bg-slate-100 hover:bg-slate-200 disabled:bg-gray-100 disabled:text-gray-400 text-slate-700 px-3 py-1 rounded text-xs"
                            >
                              Edit
                            </button>
                          )}
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
