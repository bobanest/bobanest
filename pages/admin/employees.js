'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

export default function AdminEmployees() {
  const [list, setList] = useState([]);
  const [unpaidHoursByEmployee, setUnpaidHoursByEmployee] = useState({});
  const [form, setForm] = useState({ name: '', email: '', role: 'staff', hourlyRate: 0, assignedId: '' });
  const [loading, setLoading] = useState(true);
  const [hoursLoading, setHoursLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchList();
    fetchUnpaidHours();
  }, []);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/employees', { 
        headers: { 'x-employee-secret': process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '' } 
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setList(data);
    } catch (err) {
      console.error(err);
      setMsg('Failed to load employees');
      setMsgType('error');
    } finally { 
      setLoading(false); 
    }

    async function fetchUnpaidHours() {
      setHoursLoading(true);
      try {
        const res = await fetch('/api/admin/attendance?unpaidOnly=true', {
          headers: { 'x-employee-secret': process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '' }
        });
        if (!res.ok) throw new Error('Failed to fetch attendance');
        const logs = await res.json();

        const byEmployee = {};
        for (const row of logs) {
          const employeeId = row?.employee?._id || row?.employee;
          if (!employeeId) continue;
          if (!byEmployee[employeeId]) byEmployee[employeeId] = [];
          byEmployee[employeeId].push(row);
        }

        const summary = {};
        Object.entries(byEmployee).forEach(([employeeId, rows]) => {
          const sorted = rows.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          let lastLogin = null;
          let totalMs = 0;
          sorted.forEach((row) => {
            if (row.type === 'login') {
              lastLogin = new Date(row.timestamp);
            } else if (row.type === 'logout' && lastLogin) {
              totalMs += Math.max(0, new Date(row.timestamp) - lastLogin);
              lastLogin = null;
            }
          });
          summary[employeeId] = Math.round(((totalMs / (1000 * 60 * 60)) + Number.EPSILON) * 100) / 100;
        });
        setUnpaidHoursByEmployee(summary);
      } catch (err) {
        console.error(err);
      } finally {
        setHoursLoading(false);
      }
    }
  }

  async function save(e) {
    e.preventDefault();
    setMsg('');
    
    if (!form.name || !form.email) {
      setMsg('Name and email are required');
      setMsgType('error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        hourlyRate: form.hourlyRate,
      };
      if (form.assignedId?.trim()) {
        payload.assignedId = form.assignedId.trim();
      }
      if (editingId) {
        payload._id = editingId;
      }

      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-employee-secret': process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '' 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setMsg(`Employee ${editingId ? 'updated' : 'created'} successfully!`);
        setMsgType('success');
        setForm({ name: '', email: '', role: 'staff', hourlyRate: 0, assignedId: '' });
        setEditingId(null);
        setTimeout(() => { fetchList(); }, 500);
      } else {
        const err = await res.json();
        setMsg(err.error || 'Error saving employee');
        setMsgType('error');
      }
    } catch (err) { 
      setMsg('Error saving employee');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  }

  function editEmployee(emp) {
    setForm({ name: emp.name, email: emp.email, role: emp.role, hourlyRate: emp.hourlyRate, assignedId: emp.assignedId || '' });
    setEditingId(emp._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm({ name: '', email: '', role: 'staff', hourlyRate: 0, assignedId: '' });
    setEditingId(null);
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-6xl mx-auto p-8">
          <h1 className="text-4xl font-bold mb-2">👥 Employee Management</h1>
          <p className="text-gray-600 mb-8">Create and manage your team members and review HR unpaid hours</p>

          {msg && (
            <div className={`p-4 rounded-lg mb-6 ${msgType === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {msg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md p-6 sticky top-8">
                <h2 className="text-xl font-bold mb-4">
                  {editingId ? '✏️ Edit Employee' : '➕ New Employee'}
                </h2>
                
                <form onSubmit={save} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., John Smith"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      placeholder="e.g., john@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Employee ID</label>
                    <input
                      type="text"
                      placeholder="Leave blank to auto-generate"
                      value={form.assignedId}
                      onChange={(e) => setForm({ ...form, assignedId: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Custom employee ID is optional. Leave empty to generate one automatically.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="staff">Staff</option>
                      <option value="barista">Barista</option>
                      <option value="cashier">Cashier</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="15.00"
                      value={form.hourlyRate}
                      onChange={(e) => setForm({ ...form, hourlyRate: parseFloat(e.target.value || 0) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition"
                    >
                      {saving ? 'Saving...' : (editingId ? 'Update Employee' : 'Create Employee')}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium px-4 py-2 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* List Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold">Employee List ({list.length})</h2>
                  <p className="text-sm text-gray-500 mt-1">Unpaid hours are from unpaid login/logout records.</p>
                </div>

                {loading ? (
                  <div className="p-12 text-center text-gray-500">
                    <div className="animate-spin">⏳</div>
                    <p className="mt-2">Loading employees...</p>
                  </div>
                ) : list.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <p>No employees yet. Create one to get started!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee ID</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Hourly Rate</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Unpaid Hours</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {list.map((emp) => (
                          <tr key={emp._id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{emp.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-700 font-medium">{emp.assignedId || '—'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{emp.email}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                                {emp.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">${emp.hourlyRate.toFixed(2)}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-purple-700">
                              {hoursLoading ? '...' : (unpaidHoursByEmployee[emp._id] || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <button
                                onClick={() => editEmployee(emp)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Edit
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
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
