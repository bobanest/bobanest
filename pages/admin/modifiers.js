'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminModifiers() {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ name: '', required: false, multiple: false, options: [] });
  const [editingId, setEditingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchGroups();
    fetchProducts();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await axios.get('/api/admin/modifiers');
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to fetch modifiers', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/admin/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const payload = { ...form, applicableProducts: selectedProducts };
    try {
      if (editingId) {
        await axios.put(`/api/admin/modifiers?id=${editingId}`, payload);
        setMessage('Modifier updated successfully!');
      } else {
        await axios.post('/api/admin/modifiers', payload);
        setMessage('Modifier created successfully!');
      }
      // Reset form and refresh list
      setForm({ name: '', required: false, multiple: false, options: [] });
      setSelectedProducts([]);
      setEditingId(null);
      await fetchGroups(); // refresh list
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error saving modifier');
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    setForm(prev => ({ ...prev, options: [...prev.options, { name: '', price: 0 }] }));
  };

  const updateOption = (idx, field, value) => {
    const newOptions = [...form.options];
    newOptions[idx][field] = field === 'price' ? parseFloat(value) : value;
    setForm(prev => ({ ...prev, options: newOptions }));
  };

  const removeOption = (idx) => {
    setForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
  };

  const handleEdit = (group) => {
    setForm({
      name: group.name,
      required: group.required,
      multiple: group.multiple,
      options: group.options.map(opt => ({ name: opt.name, price: opt.price })),
    });
    setSelectedProducts(group.applicableProducts.map(p => p._id || p));
    setEditingId(group._id);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this modifier group?')) {
      try {
        await axios.delete(`/api/admin/modifiers?id=${id}`);
        await fetchGroups();
      } catch (err) {
        alert('Delete failed');
      }
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6">Manage Modifiers (Size, Boba, etc.)</h1>
          {message && <div className="bg-green-100 text-green-700 p-2 rounded mb-4">{message}</div>}
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow mb-8 max-w-2xl">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Modifier Group' : 'Add Modifier Group'}</h2>
            <input
              type="text"
              placeholder="Group Name (e.g., Size, Boba)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="border p-2 w-full mb-2"
              required
            />
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={form.required} onChange={e => setForm({ ...form, required: e.target.checked })} />
              Required
            </label>
            <label className="flex items-center gap-2 mb-4">
              <input type="checkbox" checked={form.multiple} onChange={e => setForm({ ...form, multiple: e.target.checked })} />
              Allow multiple selections
            </label>
            <div className="mb-4">
              <label className="block font-semibold mb-1">Applicable Products (leave empty for all)</label>
              <select
                multiple
                value={selectedProducts}
                onChange={e => setSelectedProducts(Array.from(e.target.selectedOptions, o => o.value))}
                className="border p-2 w-full h-32"
              >
                {products.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
            </div>
            <h3 className="font-semibold mb-2">Options</h3>
            {form.options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Option name"
                  value={opt.name}
                  onChange={e => updateOption(idx, 'name', e.target.value)}
                  className="border p-2 flex-1"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={opt.price}
                  onChange={e => updateOption(idx, 'price', e.target.value)}
                  className="border p-2 w-24"
                />
                <button type="button" onClick={() => removeOption(idx)} className="text-red-600">Remove</button>
              </div>
            ))}
            <button type="button" onClick={addOption} className="text-blue-600 text-sm mb-4">+ Add Option</button>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50">
                {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ name: '', required: false, multiple: false, options: [] });
                    setSelectedProducts([]);
                  }}
                  className="text-gray-500"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <h2 className="text-2xl font-bold mb-4">Existing Modifier Groups</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map(group => (
              <div key={group._id} className="bg-white p-4 rounded shadow">
                <div className="flex justify-between">
                  <h3 className="font-bold text-lg">{group.name} {group.required && '(Required)'} {group.multiple && '(Multiple)'}</h3>
                  <div>
                    <button onClick={() => handleEdit(group)} className="text-blue-600 mr-2">Edit</button>
                    <button onClick={() => handleDelete(group._id)} className="text-red-600">Delete</button>
                  </div>
                </div>
                <div className="mt-2">
                  {group.options.map((opt, idx) => (
                    <span key={idx} className="inline-block bg-gray-100 rounded-full px-2 py-1 text-xs mr-1 mb-1">
                      {opt.name} (+${opt.price})
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Applies to: {group.applicableProducts?.length ? group.applicableProducts.map(p => p.name).join(', ') : 'All products'}
                </p>
              </div>
            ))}
            {groups.length === 0 && <p className="text-gray-500">No modifier groups yet. Create one above.</p>}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}