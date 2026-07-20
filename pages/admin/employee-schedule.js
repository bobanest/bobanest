'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

const API_SECRET = process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '';

function getMonthInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function toDatetimeLocalInput(value) {
  const d = new Date(value || Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateKey(dateValue) {
  const d = new Date(dateValue);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthLabel(monthValue) {
  const [year, month] = monthValue.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
}

function buildCalendarDays(monthValue) {
  const [year, month] = monthValue.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }).map((_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function getDefaultShiftRange(dateOverride = null) {
  const base = dateOverride ? new Date(dateOverride) : new Date();
  const start = new Date(base);
  start.setHours(9, 0, 0, 0);
  const end = new Date(base);
  end.setHours(17, 0, 0, 0);
  return {
    startAt: toDatetimeLocalInput(start),
    endAt: toDatetimeLocalInput(end),
  };
}

export default function AdminEmployeeSchedulePage() {
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthInputValue());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [editingId, setEditingId] = useState('');

  const [form, setForm] = useState({
    employeeId: '',
    title: 'Shift',
    ...getDefaultShiftRange(),
    notes: '',
  });

  async function fetchEmployees() {
    const res = await fetch('/api/admin/employees', {
      headers: { 'x-employee-secret': API_SECRET },
    });
    if (!res.ok) throw new Error('Failed to fetch employees');
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
  }

  async function fetchSchedules(month = selectedMonth) {
    const res = await fetch(`/api/admin/employee-schedules?month=${encodeURIComponent(month)}`, {
      headers: { 'x-employee-secret': API_SECRET },
    });
    if (!res.ok) throw new Error('Failed to fetch schedules');
    const data = await res.json();
    setSchedules(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchEmployees();
      } catch (err) {
        setMsg(err.message || 'Failed to load employees');
        setMsgType('error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchSchedules(selectedMonth);
      } catch (err) {
        setMsg(err.message || 'Failed to load schedules');
        setMsgType('error');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedMonth]);

  const schedulesByDate = useMemo(() => {
    const grouped = {};
    for (const row of schedules) {
      const key = toDateKey(row.startAt);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    });
    return grouped;
  }, [schedules]);

  const calendarDays = useMemo(() => buildCalendarDays(selectedMonth), [selectedMonth]);

  async function saveSchedule(e) {
    e.preventDefault();
    setMsg('');
    if (!form.employeeId || !form.startAt || !form.endAt) {
      setMsg('Please select employee and shift time');
      setMsgType('error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        title: form.title || 'Shift',
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        notes: form.notes || '',
      };
      const endpoint = '/api/admin/employee-schedules';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...payload, id: editingId } : payload;

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-employee-secret': API_SECRET,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save schedule');

      await fetchSchedules(selectedMonth);
      setMsg(`Shift ${editingId ? 'updated' : 'created'} successfully.`);
      setMsgType('success');
      setEditingId('');
      setForm({
        employeeId: '',
        title: 'Shift',
        ...getDefaultShiftRange(),
        notes: '',
      });
    } catch (err) {
      setMsg(err.message || 'Failed to save schedule');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  }

  function startNewShiftForDay(day) {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(day);
    end.setHours(17, 0, 0, 0);
    setEditingId('');
    setForm((prev) => ({
      ...prev,
      startAt: toDatetimeLocalInput(start),
      endAt: toDatetimeLocalInput(end),
    }));
  }

  function startEditShift(shift) {
    setEditingId(shift._id);
    setForm({
      employeeId: shift.employee?._id || '',
      title: shift.title || 'Shift',
      startAt: toDatetimeLocalInput(shift.startAt),
      endAt: toDatetimeLocalInput(shift.endAt),
      notes: shift.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId('');
    setForm({
      employeeId: '',
      title: 'Shift',
      ...getDefaultShiftRange(),
      notes: '',
    });
  }

  async function deleteShift() {
    if (!editingId) return;
    if (!window.confirm('Delete this shift?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/employee-schedules?id=${encodeURIComponent(editingId)}`, {
        method: 'DELETE',
        headers: { 'x-employee-secret': API_SECRET },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete shift');

      await fetchSchedules(selectedMonth);
      setMsg('Shift deleted.');
      setMsgType('success');
      cancelEdit();
    } catch (err) {
      setMsg(err.message || 'Failed to delete shift');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  }

  async function runNotificationsNow() {
    setNotifying(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/employee-schedule-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: API_SECRET }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run notifications');

      const weeklySent = Number(data?.weekly?.sent || 0);
      const reminderSent = Number(data?.reminders?.sent || 0);
      setMsg(`Notifications completed. Weekly sent: ${weeklySent}, 2-hour reminders sent: ${reminderSent}.`);
      setMsgType('success');
    } catch (err) {
      setMsg(err.message || 'Failed to run notifications');
      setMsgType('error');
    } finally {
      setNotifying(false);
    }
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Employee Schedule Calendar</h1>
              <p className="text-gray-600">Monthly scheduling with weekly and 2-hour shift notifications.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <button
                type="button"
                onClick={runNotificationsNow}
                disabled={notifying}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
              >
                {notifying ? 'Running...' : 'Run Notifications Now'}
              </button>
            </div>
          </div>

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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2">
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold">{monthLabel(selectedMonth)}</h2>
                </div>

                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {day}
                    </div>
                  ))}
                </div>

                {loading ? (
                  <div className="p-10 text-center text-gray-500">Loading schedule...</div>
                ) : (
                  <div className="grid grid-cols-7">
                    {calendarDays.map((day) => {
                      const inMonth = day.getMonth() + 1 === Number(selectedMonth.split('-')[1]);
                      const key = toDateKey(day);
                      const dayShifts = schedulesByDate[key] || [];

                      return (
                        <div
                          key={`${key}-${day.getMonth()}`}
                          className={`min-h-[130px] border-b border-r border-gray-100 p-2 ${inMonth ? 'bg-white' : 'bg-gray-50'} cursor-pointer`}
                          onClick={() => startNewShiftForDay(day)}
                        >
                          <div className={`text-xs font-semibold mb-1 ${inMonth ? 'text-gray-800' : 'text-gray-400'}`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayShifts.slice(0, 3).map((shift) => (
                              <button
                                key={shift._id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditShift(shift);
                                }}
                                className="w-full text-left text-[11px] bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded px-2 py-1"
                              >
                                <div className="font-semibold truncate">{shift.employee?.name || 'Unknown'}</div>
                                <div>
                                  {new Date(shift.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </button>
                            ))}
                            {dayShifts.length > 3 && (
                              <div className="text-[11px] text-gray-500 px-1">+{dayShifts.length - 3} more</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-1">
              <div className="bg-white rounded-xl shadow-md p-6 sticky top-8">
                <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Shift' : 'Add Shift'}</h2>
                <form onSubmit={saveSchedule} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                    <select
                      value={form.employeeId}
                      onChange={(e) => setForm((prev) => ({ ...prev, employeeId: e.target.value }))}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shift title</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Shift"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                    <input
                      type="datetime-local"
                      value={form.startAt}
                      onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                    <input
                      type="datetime-local"
                      value={form.endAt}
                      onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      rows={3}
                      placeholder="Optional notes for the employee"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      {saving ? 'Saving...' : editingId ? 'Update Shift' : 'Add Shift'}
                    </button>
                    {editingId && (
                      <>
                        <button
                          type="button"
                          onClick={deleteShift}
                          disabled={saving}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-2 rounded-lg font-medium"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
