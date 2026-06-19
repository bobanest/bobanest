'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';
import axios from 'axios';
import ImageUpload from '@/components/ImageUpload';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', imageUrl: '', isNewItem: false });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const res = await axios.get('/api/admin/products');
    setProducts(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await axios.put(`/api/admin/products?id=${editingId}`, form);
    } else {
      await axios.post('/api/admin/products', form);
    }
    setForm({ name: '', description: '', price: '', category: '', imageUrl: '', isNewItem: false });
    setEditingId(null);
    fetchProducts();
  };

  const handleEdit = (p) => {
    setForm({ name: p.name, description: p.description, price: p.price, category: p.category, imageUrl: p.imageUrl, isNewItem: p.isNewItem || false });
    setEditingId(p._id);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) {
      await axios.delete(`/api/admin/products?id=${id}`);
      fetchProducts();
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6">Manage Products</h1>
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md mb-8 max-w-2xl">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border p-2 rounded" required />
              <input type="text" placeholder="Category (e.g., Milk Tea)" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border p-2 rounded" required />
              <input type="number" step="0.01" placeholder="Price" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="border p-2 rounded" required />
              <div>
                <label className="block text-sm mb-1">Product Cup Image</label>
                <ImageUpload onUpload={(url) => setForm({...form, imageUrl: url})} currentImageUrl={form.imageUrl} />
              </div>
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="border p-2 rounded col-span-2" rows="3" required />
              <label className="flex items-center gap-2 col-span-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isNewItem}
                  onChange={e => setForm({...form, isNewItem: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="font-medium text-sm">Mark as <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">NEW</span> (shows badge on menu)</span>
              </label>
            </div>
            <button type="submit" className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">{editingId ? 'Update' : 'Create'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', description: '', price: '', category: '', imageUrl: '', isNewItem: false }); }} className="ml-2 text-gray-500">Cancel</button>}
          </form>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map(p => (
              <div key={p._id} className="bg-white p-4 rounded shadow flex">
                <img src={p.imageUrl} alt={p.name} className="w-24 h-24 object-cover rounded mr-4" />
                <div className="flex-1">
                  <h3 className="font-bold">{p.name} {p.isNewItem && <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">NEW</span>}</h3>
                  <p className="text-sm text-gray-600">{p.category} - ${p.price}</p>
                </div>
                <div>
                  <button onClick={() => handleEdit(p)} className="text-blue-600 mr-2">Edit</button>
                  <button onClick={() => handleDelete(p._id)} className="text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}