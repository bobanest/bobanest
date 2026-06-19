'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';
import axios from 'axios';

const STARS = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | pending | approved

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/reviews');
      setReviews(res.data);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerified = async (review) => {
    try {
      await axios.put('/api/admin/reviews', { id: review._id, verified: !review.verified });
      fetchReviews();
    } catch (err) {
      console.error('Failed to update review', err);
    }
  };

  const deleteReview = async (id) => {
    if (!confirm('Delete this review?')) return;
    try {
      await axios.delete(`/api/admin/reviews?id=${id}`);
      fetchReviews();
    } catch (err) {
      console.error('Failed to delete review', err);
    }
  };

  const filtered = reviews.filter(r => {
    if (filter === 'pending') return !r.verified;
    if (filter === 'approved') return r.verified;
    return true;
  });

  const pendingCount = reviews.filter(r => !r.verified).length;

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Product Reviews</h1>
            {pendingCount > 0 && (
              <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">
                {pendingCount} pending approval
              </span>
            )}
          </div>
          <p className="text-gray-500 mb-6">{reviews.length} total reviews</p>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6">
            {[['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === val
                    ? 'bg-gray-800 text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-gray-400">Loading reviews...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No reviews found.</div>
          ) : (
            <div className="space-y-4">
              {filtered.map(review => (
                <div
                  key={review._id}
                  className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                    review.verified ? 'border-green-400' : 'border-yellow-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="font-semibold text-gray-800">
                          {review.customerName || 'Anonymous'}
                        </span>
                        <span className="text-yellow-500 text-lg tracking-tight">
                          {STARS(review.rating)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            review.verified
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {review.verified ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-primary font-medium mb-2">
                        {review.productId?.name || 'Unknown product'}
                      </p>
                      <p className="text-gray-700 text-sm">{review.comment}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => toggleVerified(review)}
                        className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                          review.verified
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {review.verified ? 'Unapprove' : 'Approve'}
                      </button>
                      <button
                        onClick={() => deleteReview(review._id)}
                        className="text-xs px-3 py-1.5 rounded font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
