'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const STARS = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function ProductModal({ product, onClose, onAddToCart }) {
  const [modifiers, setModifiers] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [totalPrice, setTotalPrice] = useState(product.price);
  const [reviews, setReviews] = useState([]);
  const [showReviews, setShowReviews] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  useEffect(() => {
    axios.get(`/api/reviews?productId=${product._id}`)
      .then(res => setReviews(res.data.filter(r => r.verified)))
      .catch(() => {});
  }, [product._id]);

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewMsg('');
    try {
      await axios.post('/api/reviews', {
        productId: product._id,
        name: reviewForm.name,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      setReviewMsg('Review submitted! It will appear after approval.');
      setReviewForm({ name: '', rating: 5, comment: '' });
    } catch {
      setReviewMsg('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    const fetchModifiers = async () => {
      try {
        const res = await axios.get('/api/admin/modifiers');
        const currentProductId = String(product._id || product.id || '');
        // Filter modifiers that apply to this product
        const applicable = (Array.isArray(res.data) ? res.data : []).filter(group => {
          const applicableProducts = Array.isArray(group.applicableProducts)
            ? group.applicableProducts
            : [];

          if (applicableProducts.length === 0) {
            return true;
          }

          return applicableProducts.some((p) => {
            const refId = typeof p === 'object' && p !== null ? p._id : p;
            return String(refId) === currentProductId;
          });
        });
        setModifiers(applicable);
      } catch (err) {
        console.error('Failed to load modifiers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchModifiers();
  }, [product._id]);

  useEffect(() => {
    let additional = 0;
    modifiers.forEach(group => {
      const selected = selectedOptions[group._id];
      if (!selected) return;
      if (Array.isArray(selected)) {
        selected.forEach(optId => {
          const opt = group.options.find(o => o._id === optId);
          if (opt) additional += opt.price;
        });
      } else {
        const opt = group.options.find(o => o._id === selected);
        if (opt) additional += opt.price;
      }
    });
    setTotalPrice(product.price + additional);
  }, [selectedOptions, modifiers, product.price]);

  const handleOptionChange = (groupId, optionId, isMultiple) => {
    setSelectedOptions(prev => {
      if (isMultiple) {
        const current = prev[groupId] || [];
        const updated = current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId];
        return { ...prev, [groupId]: updated };
      } else {
        return { ...prev, [groupId]: optionId };
      }
    });
  };

  const isMandatoryFulfilled = () => {
    for (const group of modifiers) {
      if (group.required) {
        const selected = selectedOptions[group._id];
        if (!selected || (Array.isArray(selected) && selected.length === 0)) return false;
      }
    }
    return true;
  };

  const handleAddToCart = () => {
    // Build selected modifiers in the format expected by the cart
    const selectedModifiers = modifiers.map(group => ({
      groupName: group.name,
      options: (() => {
        const selected = selectedOptions[group._id];
        if (!selected) return [];
        if (Array.isArray(selected)) {
          return group.options.filter(opt => selected.includes(opt._id)).map(opt => opt.name);
        } else {
          const opt = group.options.find(o => o._id === selected);
          return opt ? [opt.name] : [];
        }
      })(),
    })).filter(m => m.options.length > 0);

    onAddToCart({
      ...product,
      finalPrice: totalPrice,
      modifiers: selectedModifiers,
    });
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">Loading options...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-1">{product.name}</h2>
          {avgRating && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-yellow-500 text-sm">{STARS(Math.round(avgRating))}</span>
              <span className="text-sm text-gray-500">{avgRating} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          )}
          <p className="text-gray-600 mb-4">{product.description}</p>

          {modifiers.length === 0 && (
            <p className="text-gray-500 mb-4">No options to customize.</p>
          )}

          {modifiers.map(group => (
            <div key={group._id} className="mb-4 border-b pb-3">
              <p className="font-semibold">
                {group.name} {group.required && <span className="text-red-500">*</span>}
              </p>
              <div className="mt-2 space-y-2">
                {group.options.map(opt => (
                  <label key={opt._id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type={group.multiple ? 'checkbox' : 'radio'}
                      name={group._id}
                      checked={
                        group.multiple
                          ? (selectedOptions[group._id] || []).includes(opt._id)
                          : selectedOptions[group._id] === opt._id
                      }
                      onChange={() => handleOptionChange(group._id, opt._id, group.multiple)}
                      className="w-4 h-4"
                    />
                    <span>{opt.name}</span>
                    {opt.price > 0 && <span className="text-sm text-gray-500">(+${opt.price})</span>}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-4 pt-4 border-t">
            <p className="text-xl font-bold">Total: ${totalPrice.toFixed(2)}</p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAddToCart}
              disabled={!isMandatoryFulfilled()}
              className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-secondary transition disabled:opacity-50"
            >
              Add to Cart
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-dark py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>

          {/* Reviews section */}
          <div className="mt-6 border-t pt-4">
            <button
              onClick={() => setShowReviews(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-primary transition"
            >
              <span>{showReviews ? '▲' : '▼'}</span>
              Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
              {!avgRating && <span className="text-gray-400 font-normal">— Be the first to review!</span>}
            </button>

            {showReviews && (
              <div className="mt-4 space-y-4">
                {reviews.length > 0 && (
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {reviews.map(r => (
                      <div key={r._id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-yellow-500 text-sm">{STARS(r.rating)}</span>
                          <span className="text-xs font-medium text-gray-700">{r.customerName || 'Anonymous'}</span>
                        </div>
                        <p className="text-sm text-gray-600">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleReviewSubmit} className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Leave a Review</p>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={reviewForm.name}
                    onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full border rounded p-2 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Rating:</label>
                    <select
                      value={reviewForm.rating}
                      onChange={e => setReviewForm(f => ({ ...f, rating: Number(e.target.value) }))}
                      className="border rounded p-1 text-sm"
                    >
                      {[5, 4, 3, 2, 1].map(n => (
                        <option key={n} value={n}>{STARS(n)}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    placeholder="Share your thoughts..."
                    value={reviewForm.comment}
                    onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                    required
                    rows={3}
                    className="w-full border rounded p-2 text-sm resize-none"
                  />
                  {reviewMsg && (
                    <p className={`text-xs ${reviewMsg.includes('submitted') ? 'text-green-600' : 'text-red-500'}`}>
                      {reviewMsg}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full bg-primary text-white py-2 rounded text-sm hover:bg-secondary transition disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}