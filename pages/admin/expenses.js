'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

const CATEGORIES = ['ingredients', 'packaging', 'equipment', 'rent', 'utilities', 'marketing', 'labor', 'other'];
const emptyForm = { description: '', amount: '', category: 'ingredients', date: new Date().toISOString().slice(0, 10), notes: '' };

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [month, setMonth] = useState(thisMonth());
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchExpenses = async (m) => {
    const res = await fetch(`/api/admin/expenses?month=${m}`);
    const data = await res.json();
    setExpenses(data.expenses || []);
    setTotal(data.total || 0);
  };

  useEffect(() => { fetchExpenses(month); }, [month]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const method = editing ? 'PUT' : 'POST';
    const body = editing ? { id: editing, ...form } : form;
    const res = await fetch('/api/admin/expenses', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setMsg(editing ? '✓ Updated' : '✓ Added');
      setForm(emptyForm);
      setEditing(null);
      fetchExpenses(month);
    } else {
      const d = await res.json();
      setMsg(`Error: ${d.error}`);
    }
    setLoading(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await fetch('/api/admin/expenses', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchExpenses(month);
  };

  const startEdit = (exp) => {
    setEditing(exp._id);
    setForm({
      description: exp.description,
      amount: exp.amount,
      category: exp.category,
      date: new Date(exp.date).toISOString().slice(0, 10),
      notes: exp.notes || '',
    });
    window.scrollTo(0, 0);
  };

  // Group by category for summary
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Expenses</h1>

          {/* Add/Edit form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="font-bold mb-4">{editing ? 'Edit Expense' : 'Add Expense'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1">Description *</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="e.g. Taro powder supply" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Amount ($) *</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="0.00" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border p-2 rounded text-sm capitalize">
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border p-2 rounded text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border p-2 rounded text-sm" />
              </div>
            </div>
            {msg && <p className={`text-sm mb-3 ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">{loading ? 'Saving...' : editing ? 'Update' : 'Add Expense'}</button>
              {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }} className="border px-4 py-2 rounded text-sm">Cancel</button>}
            </div>
          </form>

          {/* Month selector + summary */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold">Month:</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border p-2 rounded text-sm" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">${total.toFixed(2)}</p>
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(categoryTotals).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <div key={cat} className="bg-white rounded-lg shadow p-3 text-center">
                  <p className="text-xs text-gray-500 capitalize">{cat}</p>
                  <p className="font-bold text-red-600">${amt.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Expenses table */}
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e._id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <p>{e.description}</p>
                      {e.notes && <p className="text-xs text-gray-400">{e.notes}</p>}
                    </td>
                    <td className="p-3 capitalize text-gray-600">{e.category}</td>
                    <td className="p-3 text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="p-3 text-right font-semibold text-red-600">${e.amount.toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => startEdit(e)} className="text-blue-500 hover:text-blue-700 text-xs mr-3">Edit</button>
                      <button onClick={() => handleDelete(e._id)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No expenses for this month.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
