'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function InstagramSettings() {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('/api/instagram/settings').then(res => setHandle(res.data.handle)).catch(() => {});
  }, []);

  const saveHandle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/instagram/settings', { handle });
      setMessage('Instagram handle saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error saving handle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6">Instagram Feed Settings</h1>
          <form onSubmit={saveHandle} className="bg-white p-6 rounded shadow max-w-md">
            <label className="block mb-2 font-semibold">Instagram Username (without @)</label>
            <input type="text" value={handle} onChange={e => setHandle(e.target.value)} className="border p-2 w-full rounded mb-4" placeholder="e.g., bobanest" required />
            <button type="submit" disabled={loading} className="bg-primary text-white px-4 py-2 rounded">Save</button>
            {message && <p className="mt-2 text-green-600">{message}</p>}
          </form>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}