'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useEffect, useMemo, useState } from 'react';

const API_SECRET = process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '';

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function toDatetimeLocalInput(value) {
  const d = new Date(value || Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState([]);
  const [payrollRows, setPayrollRows] = useState([]);
  const [selectedPayrollEmployeeIds, setSelectedPayrollEmployeeIds] = useState([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [running, setRunning] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editAttendanceForm, setEditAttendanceForm] = useState({
    employeeId: '',
    type: 'login',
    timestamp: '',
  });
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    type: 'login',
    timestamp: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    fetchList();
    fetchPaymentHistory();
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
      setPayments(Array.isArray(data) ? data : []);
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

  async function fetchPaymentHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/admin/payments/history', {
        headers: { 'x-employee-secret': API_SECRET },
      });
      if (!res.ok) throw new Error('Failed to fetch payment history');
      const data = await res.json();
      setPaymentHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setMsg('Failed to load payment history');
      setMsgType('error');
    } finally {
      setHistoryLoading(false);
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

  async function loadPayrollPreview(e) {
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

    setPreviewLoading(true);
    try {
      const res = await fetch('/api/admin/payments/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-secret': API_SECRET,
        },
        body: JSON.stringify({ periodStart: start, periodEnd: end, previewOnly: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load payroll preview');

      const rows = (data.preview || []).map((row) => ({
        employeeId: row.employee?._id,
        employeeName: row.employee?.name || 'Unknown',
        employeeAssignedId: row.employee?.assignedId || '',
        hourlyRate: Number(row.hourlyRate || 0),
        totalHours: round2(row.totalHours),
        payableHours: round2(row.payableHours),
        gross: round2(row.gross),
      }));
      setPayrollRows(rows);
      setSelectedPayrollEmployeeIds(rows.filter((r) => r.totalHours > 0).map((r) => r.employeeId));
      setMsg(`Loaded hours for ${rows.length} employees. Adjust payable hours if needed.`);
      setMsgType('success');
    } catch (err) {
      setMsg(err.message || 'Error loading payroll preview');
      setMsgType('error');
    } finally {
      setPreviewLoading(false);
    }
  }

  function updatePayableHours(employeeId, value) {
    const parsed = Number(value);
    setPayrollRows((prev) =>
      prev.map((row) => {
        if (row.employeeId !== employeeId) return row;
        const nextPayable = Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, row.totalHours)) : 0;
        return {
          ...row,
          payableHours: round2(nextPayable),
          gross: round2(nextPayable * row.hourlyRate),
        };
      })
    );
  }

  function togglePayrollEmployee(employeeId) {
    setSelectedPayrollEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  }

  async function runPayroll() {
    setMsg('');
    if (!start || !end) {
      setMsg('Please select both start and end dates');
      setMsgType('error');
      return;
    }
    if (!payrollRows.length) {
      setMsg('Please load employee hour preview first.');
      setMsgType('error');
      return;
    }

    const payableHoursByEmployee = {};
    payrollRows
      .filter((row) => selectedPayrollEmployeeIds.includes(row.employeeId))
      .forEach((row) => {
        payableHoursByEmployee[row.employeeId] = Number(row.payableHours || 0);
      });

    if (!Object.keys(payableHoursByEmployee).length) {
      setMsg('Please select at least one employee to pay.');
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
        body: JSON.stringify({
          periodStart: start,
          periodEnd: end,
          payableHoursByEmployee,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Payroll created for ${data.payments?.length || 0} employees.`);
        setMsgType('success');
        fetchList();
        fetchPaymentHistory();
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

  function startEditAttendance(row) {
    setEditingAttendanceId(row._id);
    setEditAttendanceForm({
      employeeId: row.employee?._id || '',
      type: row.type || 'login',
      timestamp: toDatetimeLocalInput(row.timestamp),
    });
    setMsg('');
  }

  function cancelEditAttendance() {
    setEditingAttendanceId('');
    setEditAttendanceForm({ employeeId: '', type: 'login', timestamp: '' });
  }

  async function saveAttendanceEdit() {
    if (!editingAttendanceId) return;
    if (!editAttendanceForm.employeeId || !editAttendanceForm.type || !editAttendanceForm.timestamp) {
      setMsg('Please fill employee, type, and time before saving.');
      setMsgType('error');
      return;
    }

    setEditSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-secret': API_SECRET,
        },
        body: JSON.stringify({
          id: editingAttendanceId,
          employeeId: editAttendanceForm.employeeId,
          type: editAttendanceForm.type,
          timestamp: new Date(editAttendanceForm.timestamp).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update attendance record');

      setAttendance((prev) => prev.map((row) => (row._id === data._id ? data : row)));
      setMsg('Attendance record updated successfully.');
      setMsgType('success');
      cancelEditAttendance();
    } catch (err) {
      setMsg(err.message || 'Failed to update attendance record');
      setMsgType('error');
    } finally {
      setEditSaving(false);
    }
  }

  const totalGross = payments.reduce((sum, p) => sum + (p.gross || 0), 0);
  const totalHours = payments.reduce((sum, p) => sum + ((p.paidHours ?? p.hours) || 0), 0);
  const selectedPayrollRows = payrollRows.filter((row) => selectedPayrollEmployeeIds.includes(row.employeeId));
  const previewTotalHours = selectedPayrollRows.reduce((sum, row) => sum + (row.totalHours || 0), 0);
  const previewPayableHours = selectedPayrollRows.reduce((sum, row) => sum + (row.payableHours || 0), 0);
  const previewGross = selectedPayrollRows.reduce((sum, row) => sum + (row.gross || 0), 0);

  const unpaidAttendanceCount = useMemo(
    () => attendance.filter((row) => !row.isPaid).length,
    [attendance]
  );

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-6xl mx-auto p-8">
          <h1 className="text-4xl font-bold mb-2">💰 Payroll Management</h1>
          <p className="text-gray-600 mb-8">Review total hours by employee, choose payable hours, then generate payroll.</p>

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
            <h2 className="text-2xl font-bold mb-4">🧮 Payroll Period & Hours Selection</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Start *</label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period End *</label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <button
                type="button"
                onClick={loadPayrollPreview}
                disabled={previewLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition"
              >
                {previewLoading ? 'Loading...' : 'Load Employee Hours'}
              </button>
              <button
                type="button"
                onClick={runPayroll}
                disabled={running || !payrollRows.length}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition"
              >
                {running ? 'Creating...' : 'Create Payroll'}
              </button>
              <button
                type="button"
                onClick={fetchAttendance}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-4 py-2 rounded-lg transition"
              >
                Refresh Clock Records
              </button>
            </div>
          </div>

          {payrollRows.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6 border border-indigo-200">
                  <p className="text-indigo-700 text-sm font-medium">Total Hours (All Employees)</p>
                  <p className="text-3xl font-bold text-indigo-900">{round2(previewTotalHours).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-6 border border-emerald-200">
                  <p className="text-emerald-700 text-sm font-medium">Selected Payable Hours</p>
                  <p className="text-3xl font-bold text-emerald-900">{round2(previewPayableHours).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <p className="text-green-700 text-sm font-medium">Payroll Total</p>
                  <p className="text-3xl font-bold text-green-900">${round2(previewGross).toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold">Employee Payroll Hours</h2>
                  <p className="text-sm text-gray-500 mt-1">Select employees and adjust payable hours (0 to total hours).</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Select</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Hourly Rate</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Hours</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Hours To Pay</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Gross</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payrollRows.map((row) => (
                        <tr key={row.employeeId} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedPayrollEmployeeIds.includes(row.employeeId)}
                              onChange={() => togglePayrollEmployee(row.employeeId)}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.employeeName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.employeeAssignedId || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">${round2(row.hourlyRate).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{round2(row.totalHours).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm">
                            <input
                              type="number"
                              min="0"
                              max={row.totalHours}
                              step="0.25"
                              value={row.payableHours}
                              onChange={(e) => updatePayableHours(row.employeeId, e.target.value)}
                              className="w-32 border border-gray-300 rounded-lg px-2 py-1"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-green-700">${round2(row.gross).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

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
                <p className="text-blue-700 text-sm font-medium">Total Paid Hours</p>
                <p className="text-3xl font-bold text-blue-900">{round2(totalHours).toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                <p className="text-green-700 text-sm font-medium">Total Payroll</p>
                <p className="text-3xl font-bold text-green-900">${round2(totalGross).toFixed(2)}</p>
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attendance.map((row) => (
                      <tr key={row._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="checkbox"
                            disabled={row.isPaid || editingAttendanceId === row._id}
                            checked={selectedAttendanceIds.includes(row._id)}
                            onChange={() => toggleAttendanceRow(row._id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {editingAttendanceId === row._id ? (
                            <select
                              value={editAttendanceForm.employeeId}
                              onChange={(e) => setEditAttendanceForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                              className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-52"
                            >
                              {employees.map((emp) => (
                                <option key={emp._id} value={emp._id}>
                                  {emp.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            row.employee?.name || 'Unknown'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {editingAttendanceId === row._id
                            ? (employees.find((emp) => emp._id === editAttendanceForm.employeeId)?.assignedId || '—')
                            : (row.employee?.assignedId || '—')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editingAttendanceId === row._id ? (
                            <select
                              value={editAttendanceForm.type}
                              onChange={(e) => setEditAttendanceForm((prev) => ({ ...prev, type: e.target.value }))}
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
                              value={editAttendanceForm.timestamp}
                              onChange={(e) => setEditAttendanceForm((prev) => ({ ...prev, timestamp: e.target.value }))}
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
                                onClick={saveAttendanceEdit}
                                disabled={editSaving}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs"
                              >
                                {editSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditAttendance}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={row.isPaid || (editingAttendanceId && editingAttendanceId !== row._id)}
                              onClick={() => startEditAttendance(row)}
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
                <p>No payments calculated yet. Load employee hours above to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Period</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total Hours</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Paid Hours</th>
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
                          {new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{round2(p.totalHours ?? p.hours).toFixed(2)} hrs</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{round2(p.paidHours ?? p.hours).toFixed(2)} hrs</td>
                        <td className="px-6 py-4 text-sm font-bold text-green-700">${round2(p.gross).toFixed(2)}</td>
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

          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">Payment History Ledger ({paymentHistory.length})</h2>
              <p className="text-sm text-gray-500 mt-1">Immutable timeline of payment creation and status updates.</p>
            </div>

            {historyLoading ? (
              <div className="p-10 text-center text-gray-500">Loading payment history...</div>
            ) : paymentHistory.length === 0 ? (
              <div className="p-10 text-center text-gray-500">No payment history found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">When</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Period</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Gross</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paymentHistory.map((row) => (
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
