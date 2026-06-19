'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: '',
    type: 'percentage',
    value: 0,
    minOrderAmount: 0,
    isActive: true,
    applicableProducts: [],
    startDate: '',
    endDate: '',
    description: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPromotions();
    fetchProducts();
  }, []);

  const fetchPromotions = async () => {
    const res = await axios.get('/api/admin/promotions');
    setPromotions(res.data);
  };

  const fetchProducts = async () => {
    const res = await axios.get('/api/admin/products');
    setProducts(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (editingId) {
        await axios.put(`/api/admin/promotions?id=${editingId}`, form);
        setMessage('Promotion updated!');
      } else {
        await axios.post('/api/admin/promotions', form);
        setMessage('Promotion created!');
      }
      resetForm();
      fetchPromotions();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error saving promotion');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      type: 'percentage',
      value: 0,
      minOrderAmount: 0,
      isActive: true,
      applicableProducts: [],
      startDate: '',
      endDate: '',
      description: '',
    });
    setEditingId(null);
  };

  const handleEdit = (promo) => {
    setForm({
      name: promo.name,
      type: promo.type,
      value: promo.value,
      minOrderAmount: promo.minOrderAmount,
      isActive: promo.isActive,
      applicableProducts: promo.applicableProducts.map(p => p._id || p),
      startDate: promo.startDate ? new Date(promo.startDate).toISOString().split('T')[0] : '',
      endDate: promo.endDate ? new Date(promo.endDate).toISOString().split('T')[0] : '',
      description: promo.description || '',
    });
    setEditingId(promo._id);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this promotion?')) {
      await axios.delete(`/api/admin/promotions?id=${id}`);
      fetchPromotions();
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeLabel = (type) => {
    const types = {
      percentage: '% off',
      fixed: '$ off',
      free_delivery: 'Free delivery',
      bogo: 'Buy one get one free',
      second_discount: '% off second item',
    };
    return types[type] || type;
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6">Promotions & Discounts</h1>
          {message && <div className="bg-green-100 text-green-700 p-2 rounded mb-4">{message}</div>}

          {/* Form */}
          <div className="bg-white p-6 rounded shadow mb-8">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Promotion' : 'Create New Promotion'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Promotion Name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="border p-2 rounded"
                required
              />
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="border p-2 rounded"
              >
                <option value="percentage">Percentage (%) off</option>
                <option value="fixed">Fixed amount ($) off</option>
                <option value="free_delivery">Free Delivery</option>
                <option value="bogo">Buy One Get One Free</option>
                <option value="second_discount">Second Item % off</option>
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Value (e.g., 10 for 10%)"
                value={form.value}
                onChange={e => setForm({ ...form, value: parseFloat(e.target.value) })}
                className="border p-2 rounded"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Minimum Order Amount"
                value={form.minOrderAmount}
                onChange={e => setForm({ ...form, minOrderAmount: parseFloat(e.target.value) })}
                className="border p-2 rounded"
              />
              <div className="md:col-span-2">
                <label className="block font-semibold mb-1">Applicable Products (leave empty for all)</label>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="border p-2 rounded w-full mb-2"
                />
                <select
                  multiple
                  value={form.applicableProducts}
                  onChange={e => setForm({ ...form, applicableProducts: Array.from(e.target.selectedOptions, o => o.value) })}
                  className="border p-2 w-full h-32"
                >
                  {filteredProducts.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple products</p>
              </div>
              <input
                type="date"
                placeholder="Start Date (optional)"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="border p-2 rounded"
              />
              <input
                type="date"
                placeholder="End Date (optional)"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                className="border p-2 rounded"
              />
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="border p-2 rounded col-span-2"
                rows="2"
              />
            </div>
            <div className="mt-4 flex gap-4 items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                {editingId && (
                  <button onClick={resetForm} className="text-gray-500">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Promotions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promotions.map(promo => (
              <div key={promo._id} className={`bg-white p-4 rounded shadow ${!promo.isActive ? 'opacity-60' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{promo.name}</h3>
                    <p className="text-sm text-gray-600">
                      {getTypeLabel(promo.type)} {promo.value > 0 && `(${promo.value}${promo.type === 'percentage' || promo.type === 'second_discount' ? '%' : ''})`}
                      {promo.minOrderAmount > 0 && ` | Min order $${promo.minOrderAmount}`}
                    </p>
                    {promo.description && <p className="text-xs text-gray-500 mt-1">{promo.description}</p>}
                    {promo.applicableProducts.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Products: {promo.applicableProducts.map(p => p.name).join(', ')}
                      </p>
                    )}
                    {promo.startDate && (
                      <p className="text-xs text-gray-400">Start: {new Date(promo.startDate).toLocaleDateString()}</p>
                    )}
                    {promo.endDate && (
                      <p className="text-xs text-gray-400">End: {new Date(promo.endDate).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button onClick={() => handleEdit(promo)} className="text-blue-600">Edit</button>
                    <button onClick={() => handleDelete(promo._id)} className="text-red-600">Delete</button>
                  </div>
                </div>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${promo.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {promo.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
            {promotions.length === 0 && <p className="text-gray-500 col-span-2">No promotions yet. Create one above.</p>}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}