'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';
import axios from 'axios';
import ImageUpload from '@/components/ImageUpload';

export default function HeroSettings() {
  const [hero, setHero] = useState({ imageUrl: '', title: '', subtitle: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('/api/admin/hero')
      .then(res => setHero(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/admin/hero', hero);
      setMessage('Hero settings saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6">Hero Section Settings</h1>
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow max-w-2xl">
            <div className="mb-4">
              <label className="block font-semibold mb-2">Hero Background Image</label>
              <ImageUpload onUpload={(url) => setHero({...hero, imageUrl: url})} currentImageUrl={hero.imageUrl} />
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-2">Main Title</label>
              <input type="text" value={hero.title} onChange={e => setHero({...hero, title: e.target.value})} className="w-full border p-2 rounded" required />
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-2">Subtitle</label>
              <textarea value={hero.subtitle} onChange={e => setHero({...hero, subtitle: e.target.value})} className="w-full border p-2 rounded" rows="3" required />
            </div>
            <button type="submit" disabled={loading} className="bg-primary text-white px-4 py-2 rounded">Save Changes</button>
            {message && <p className="mt-2 text-green-600">{message}</p>}
          </form>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}