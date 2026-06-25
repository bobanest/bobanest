'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useEffect, useMemo, useState } from 'react';

const API_SECRET = process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    type: 'login',
    timestamp: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    fetchList();
    fetchEmployees();
    fetchAttendance();
  }, []);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments', {
        headers: { 'x-employee-secret': API_SECRET },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPayments(data);
    } catch (err) {
      console.error(err);
      setMsg('Failed to load payments');
      setMsgType('error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch('/api/admin/employees', {
        headers: { 'x-employee-secret': API_SECRET },
      });
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMsg('Failed to load employees');
      setMsgType('error');
    }
  }

  async function fetchAttendance() {
    setAttendanceLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const query = params.toString();
      const res = await fetch(`/api/admin/attendance${query ? `?${query}` : ''}`, {
        headers: { 'x-employee-secret': API_SECRET },
      });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const data = await res.json();
      setAttendance(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMsg('Failed to load attendance records');
      setMsgType('error');
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function runPayroll(e) {
    e.preventDefault();
    setMsg('');
    if (!start || !end) {
      setMsg('Please select both start and end dates');
      setMsgType('error');
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate >= endDate) {
      setMsg('End date must be after start date');
      setMsgType('error');
      return;
    }

    setRunning(true);
    try {
      const res = await fetch('/api/admin/payments/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-secret': API_SECRET,
        },
        body: JSON.stringify({ periodStart: start, periodEnd: end }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Payroll calculated for ${data.payments?.length || 0} employees!`);
        setMsgType('success');
        fetchList();
      } else {
        setMsg(`Error: ${data.error || 'Failed to calculate payroll'}`);
        setMsgType('error');
      }
    } catch (err) {
      setMsg('Error running payroll');
      setMsgType('error');
      console.error(err);
    } finally {
      setRunning(false);
    }
  }

  async function addManualAttendance(e) {
    e.preventDefault();
    setMsg('');
    if (!manualForm.employeeId || !manualForm.timestamp) {
      setMsg('Please select employee and time');
      setMsgType('error');
      return;
    }
    setManualSaving(true);
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
      if (!res.ok) throw new Error(data.error || 'Failed to add attendance');

      setMsg('Manual clock record added successfully.');
      setMsgType('success');
      setAttendance((prev) => [data, ...prev]);
    } catch (err) {
      setMsg(err.message || 'Failed to add attendance');
      setMsgType('error');
    } finally {
      setManualSaving(false);
    }
  }

  async function markSelectedAsPaid() {
    if (!selectedAttendanceIds.length) {
      setMsg('Select at least one clock record first.');
      setMsgType('error');
      return;
    }

    setMarkingPaid(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-secret': API_SECRET,
        },
        body: JSON.stringify({ ids: selectedAttendanceIds, isPaid: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark as paid');

      setAttendance((prev) =>
        prev.map((row) =>
          selectedAttendanceIds.includes(row._id)
            ? { ...row, isPaid: true, paidAt: new Date().toISOString() }
            : row
        )
      );
      setSelectedAttendanceIds([]);
      setMsg(`Marked ${data.count || selectedAttendanceIds.length} records as paid.`);
      setMsgType('success');
    } catch (err) {
      setMsg(err.message || 'Failed to mark attendance as paid');
      setMsgType('error');
    } finally {
      setMarkingPaid(false);
    }
  }

  function toggleAttendanceRow(id) {
    setSelectedAttendanceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const totalGross = payments.reduce((sum, p) => sum + (p.gross || 0), 0);
  const totalHours = payments.reduce((sum, p) => sum + (p.hours || 0), 0);
  const unpaidAttendanceCount = useMemo(
    () => attendance.filter((row) => !row.isPaid).length,
    [attendance]
  );

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-6xl mx-auto p-8">
          <h1 className="text-4xl font-bold mb-2">💰 Payroll Management</h1>
          <p className="text-gray-600 mb-8">Calculate payroll and manage employee clock records</p>

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
            <h2 className="text-2xl font-bold mb-4">🧮 Calculate Payroll</h2>
            <form onSubmit={runPayroll} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Start *</label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period End *</label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={running}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition"
              >
                {running ? 'Calculating...' : 'Calculate Payroll'}
              </button>
              <button
                type="button"
                onClick={fetchAttendance}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-4 py-2 rounded-lg transition"
              >
                Refresh Clock Records
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">🕒 Manual Clock In / Clock Out</h2>
            <form onSubmit={addManualAttendance} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
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
                disabled={manualSaving}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition"
              >
                {manualSaving ? 'Saving...' : 'Add Record'}
              </button>
            </form>
          </div>

          {payments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <p className="text-blue-700 text-sm font-medium">Total Hours</p>
                <p className="text-3xl font-bold text-blue-900">{totalHours.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                <p className="text-green-700 text-sm font-medium">Total Payroll</p>
                <p className="text-3xl font-bold text-green-900">${totalGross.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6 border border-amber-200">
                <p className="text-amber-700 text-sm font-medium">Unpaid Clock Records</p>
                <p className="text-3xl font-bold text-amber-900">{unpaidAttendanceCount}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Clock Records ({attendance.length})</h2>
              <button
                type="button"
                disabled={markingPaid || selectedAttendanceIds.length === 0}
                onClick={markSelectedAsPaid}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition"
              >
                {markingPaid ? 'Updating...' : `Mark Selected Paid (${selectedAttendanceIds.length})`}
              </button>
            </div>

            {attendanceLoading ? (
              <div className="p-10 text-center text-gray-500">Loading clock records...</div>
            ) : attendance.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No clock records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Select</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendance.map((row) => (
                      <tr key={row._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="checkbox"
                            disabled={row.isPaid}
                            checked={selectedAttendanceIds.includes(row._id)}
                            onChange={() => toggleAttendanceRow(row._id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {row.employee?.name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.employee?.assignedId || '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              row.type === 'login'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {row.type === 'login' ? 'Clock In' : 'Clock Out'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(row.timestamp).toLocaleString()}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">Payment Records ({payments.length})</h2>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <p>Loading payments...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p>No payments calculated yet. Run payroll for a period above to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Period</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Hours</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Gross Pay</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {p.employee?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(p.periodStart).toLocaleDateString()} -{' '}
                          {new Date(p.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.hours?.toFixed(2)} hrs</td>
                        <td className="px-6 py-4 text-sm font-bold text-green-700">
                          ${p.gross?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              p.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : p.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {p.status?.charAt(0).toUpperCase() + p.status?.slice(1) || 'Pending'}
                          </span>
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
