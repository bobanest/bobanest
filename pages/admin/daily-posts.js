'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';
import axios from 'axios';
import ImageUpload from '@/components/ImageUpload';

export default function DailyPosts() {
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', imageUrl: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    const res = await axios.get('/api/admin/daily-posts');
    setPosts(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await axios.put(`/api/admin/daily-posts?id=${editingId}`, form);
    } else {
      await axios.post('/api/admin/daily-posts', form);
    }
    setForm({ title: '', description: '', imageUrl: '' });
    setEditingId(null);
    fetchPosts();
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this post?')) {
      await axios.delete(`/api/admin/daily-posts?id=${id}`);
      fetchPosts();
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6">Manage Daily Posts</h1>
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md mb-8 max-w-2xl">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Post' : 'Add New Post'}</h2>
            <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="border p-2 w-full mb-2 rounded" required />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="border p-2 w-full mb-2 rounded" rows="3" required />
            <div className="mb-2">
              <label className="block text-sm mb-1">Post Image</label>
              <ImageUpload onUpload={(url) => setForm({...form, imageUrl: url})} currentImageUrl={form.imageUrl} />
            </div>
            <button type="submit" className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">{editingId ? 'Update' : 'Create'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ title: '', description: '', imageUrl: '' }); }} className="ml-2 text-gray-500">Cancel</button>}
          </form>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map(post => (
              <div key={post._id} className="bg-white p-4 rounded shadow flex">
                <img src={post.imageUrl} alt={post.title} className="w-24 h-24 object-cover rounded mr-4" />
                <div className="flex-1">
                  <h3 className="font-bold">{post.title}</h3>
                  <p className="text-sm text-gray-600">{post.description}</p>
                </div>
                <div>
                  <button onClick={() => { setForm(post); setEditingId(post._id); }} className="text-blue-600 mr-2">Edit</button>
                  <button onClick={() => handleDelete(post._id)} className="text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}