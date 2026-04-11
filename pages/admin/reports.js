'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Reports() {
  const [visitors, setVisitors] = useState([]);
  useEffect(() => {
    axios.get('/api/track-location?stats=true').then(res => setVisitors(res.data)).catch(() => {});
  }, []);

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-bold mb-2">Visitor Locations</h2>
            {visitors.length === 0 ? (
              <p>No data yet.</p>
            ) : (
              <ul>
                {visitors.slice(0, 10).map(v => (
                  <li key={v._id}>{v.city}, {v.country} - {new Date(v.visitedAt).toLocaleDateString()}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}