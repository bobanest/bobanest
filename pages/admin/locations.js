'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminLocations() {
  const [locations, setLocations] = useState([]);
  const [name, setName] = useState('');
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchLocations = async () => {
    const res = await axios.get('/api/admin/locations');
    setLocations(res.data || []);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = { name: name.trim(), isComingSoon };

    if (editingId) {
      await axios.put(`/api/admin/locations?id=${editingId}`, payload);
    } else {
      await axios.post('/api/admin/locations', payload);
    }

    setName('');
    setIsComingSoon(false);
    setEditingId(null);
    fetchLocations();
  };

  const handleEdit = (location) => {
    setName(location.name);
    setIsComingSoon(Boolean(location.isComingSoon));
    setEditingId(location._id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this pickup location?')) return;
    await axios.delete(`/api/admin/locations?id=${id}`);
    fetchLocations();
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Pickup Locations</h1>

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md mb-8">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Location' : 'Add New Location'}</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="5004 Mission Sq Ln, Zephyrhills"
                className="w-full border p-3 rounded"
                required
              />
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={isComingSoon}
                  onChange={e => setIsComingSoon(e.target.checked)}
                />
                Mark this location as coming soon
              </label>
            </div>
            <div className="flex gap-3 items-center mt-4">
              <button type="submit" className="bg-blue-600 text-white px-4 py-3 rounded font-medium">
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setName(''); setIsComingSoon(false); }} className="text-gray-600">
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {locations.map(location => (
              <div key={location._id} className="bg-white p-4 rounded shadow flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{location.name}</p>
                  <p className="text-xs text-gray-500">Slug: {location.slug}</p>
                  {location.isComingSoon && <p className="text-xs text-amber-600 font-medium">Coming soon</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(location)} className="text-blue-600">Edit</button>
                  <button onClick={() => handleDelete(location._id)} className="text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
