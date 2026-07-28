'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

function isModifierApplicable(group, productId) {
  if (!group) return false;
  const applicable = Array.isArray(group.applicableProducts) ? group.applicableProducts : [];
  if (applicable.length === 0) return true;
  const normalizedProductId = String(productId || '');
  return applicable.some((item) => String(item?._id || item) === normalizedProductId);
}

export default function ProductModal({ product, onClose, onAddToCart, modifierGroups = [] }) {
  const [modifiers, setModifiers] = useState(() => modifierGroups.filter((group) => isModifierApplicable(group, product._id)));
  const [selectedOptions, setSelectedOptions] = useState({});
  const [loadingModifiers, setLoadingModifiers] = useState(false);
  const [modifierError, setModifierError] = useState('');
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

  useEffect(() => {
    const localApplicable = modifierGroups.filter((group) => isModifierApplicable(group, product._id));
    setModifiers(localApplicable);
    setSelectedOptions({});
    setModifierError('');

    if (localApplicable.length > 0 || modifierGroups.length > 0) {
      setLoadingModifiers(false);
      return;
    }

    const fetchModifiers = async () => {
      setLoadingModifiers(true);
      try {
        const res = await axios.get('/api/admin/modifiers', { timeout: 8000 });
        const allGroups = Array.isArray(res.data) ? res.data : [];
        const applicableGroups = allGroups.filter((group) => isModifierApplicable(group, product._id));
        setModifiers(applicableGroups);
        if (applicableGroups.length === 0) {
          setModifierError('No customization options are available for this item right now.');
        }
      } catch (err) {
        console.error('Failed to load modifiers', err);
        setModifiers([]);
        setModifierError('We could not load customization options right now. You can still add this item to the cart.');
      } finally {
        setLoadingModifiers(false);
      }
    };

    fetchModifiers();
  }, [modifierGroups, product._id]);

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

  if (loadingModifiers) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-[#2a1812] border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#e8a33d] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#b89070] text-sm font-medium">Loading options…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-[#1a0f0c] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] flex flex-col shadow-2xl">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Product header */}
        <div className="px-6 pt-4 pb-3 flex gap-4 items-start flex-shrink-0 border-b border-white/8">
          {product.imageUrl && (
            <div className="w-20 h-20 flex-shrink-0 rounded-2xl bg-[#2a1812] overflow-hidden flex items-center justify-center">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
            </div>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="text-xl font-extrabold text-[#f5e6c8] leading-tight">{product.name}</h2>
            {avgRating && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[#e8a33d] text-xs">{'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}</span>
                <span className="text-xs text-[#6b4e37]">{avgRating} ({reviews.length})</span>
              </div>
            )}
            {product.description && (
              <p className="text-[#b89070] text-xs mt-1 leading-relaxed line-clamp-2">{product.description}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-[#6b4e37] hover:text-[#f5e6c8] transition p-1 flex-shrink-0 -mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable customize area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Customization label */}
          {modifiers.length > 0 && (
            <p className="text-[#e8a33d] text-xs font-extrabold uppercase tracking-widest">Customize Your Drink</p>
          )}

          {modifierError && (
            <div className="bg-[#2a1812] border border-white/8 rounded-xl p-3 text-[#b89070] text-sm">{modifierError}</div>
          )}

          {modifiers.map(group => {
            const isSelected = (optId) => group.multiple
              ? (selectedOptions[group._id] || []).includes(optId)
              : selectedOptions[group._id] === optId;

            return (
              <div key={group._id}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[#f5e6c8] font-bold text-sm">
                    {group.name}
                    {group.required && <span className="text-red-400 ml-1">*</span>}
                  </p>
                  {group.multiple && (
                    <span className="text-[#6b4e37] text-xs">Select all that apply</span>
                  )}
                  {!group.multiple && !group.required && (
                    <span className="text-[#6b4e37] text-xs">Optional</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map(opt => (
                    <button
                      key={opt._id}
                      type="button"
                      onClick={() => handleOptionChange(group._id, opt._id, group.multiple)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150 ${
                        isSelected(opt._id)
                          ? 'bg-[#e8a33d] text-[#1a0f0c] border-[#e8a33d] shadow-md scale-105'
                          : 'bg-[#2a1812] text-[#b89070] border-white/10 hover:border-[#e8a33d]/40 hover:text-[#f5e6c8]'
                      }`}
                    >
                      {opt.name}
                      {opt.price > 0 && (
                        <span className={`ml-1.5 text-xs ${isSelected(opt._id) ? 'text-[#1a0f0c]/70' : 'text-[#6b4e37]'}`}>
                          +${opt.price.toFixed(2)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Reviews toggle */}
          {reviews.length > 0 && (
            <div className="border-t border-white/8 pt-4">
              <button
                onClick={() => setShowReviews(v => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-[#b89070] hover:text-[#e8a33d] transition"
              >
                <span className="text-[#e8a33d]">{'★'.repeat(Math.round(avgRating || 0))}</span>
                Reviews ({reviews.length})
                <span className="text-xs">{showReviews ? '▲' : '▼'}</span>
              </button>
              {showReviews && (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {reviews.map(r => (
                    <div key={r._id} className="bg-[#2a1812] rounded-xl p-3 border border-white/8">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#e8a33d] text-xs">{'★'.repeat(r.rating)}</span>
                        <span className="text-xs font-medium text-[#d4b896]">{r.customerName || 'Anonymous'}</span>
                      </div>
                      <p className="text-xs text-[#b89070] leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Leave a review */}
          <div className="border-t border-white/8 pt-4">
            <button
              onClick={() => setShowReviews(v => !v)}
              className="text-xs text-[#6b4e37] hover:text-[#e8a33d] transition"
            >
              {avgRating ? 'Write a review ↓' : '⭐ Be the first to review!'}
            </button>
            {showReviews && (
              <form onSubmit={handleReviewSubmit} className="mt-3 bg-[#2a1812] rounded-2xl p-4 space-y-3 border border-white/8">
                <p className="text-sm font-bold text-[#f5e6c8]">Leave a Review</p>
                <input
                  type="text"
                  placeholder="Your name"
                  value={reviewForm.name}
                  onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full bg-[#150d09] border border-white/10 text-[#f5e6c8] placeholder-[#6b4e37] rounded-xl p-3 text-sm focus:outline-none focus:border-[#e8a33d]/50"
                />
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#b89070]">Rating:</span>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setReviewForm(f => ({ ...f, rating: n }))}
                        className={`text-xl transition ${n <= reviewForm.rating ? 'text-[#e8a33d]' : 'text-[#3a2518]'}`}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  placeholder="Share your thoughts…"
                  value={reviewForm.comment}
                  onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  required
                  rows={3}
                  className="w-full bg-[#150d09] border border-white/10 text-[#f5e6c8] placeholder-[#6b4e37] rounded-xl p-3 text-sm focus:outline-none focus:border-[#e8a33d]/50 resize-none"
                />
                {reviewMsg && (
                  <p className={`text-xs ${reviewMsg.includes('submitted') ? 'text-green-400' : 'text-red-400'}`}>{reviewMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-[#e8a33d] text-[#1a0f0c] font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400 transition disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sticky bottom — price + add to cart */}
        <div className="px-6 py-5 border-t border-white/10 bg-[#150d09] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#b89070] font-semibold text-sm">Total</span>
            <span className="text-[#e8a33d] font-extrabold text-2xl">${totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-3.5 rounded-2xl border border-white/15 text-[#b89070] font-semibold hover:border-white/30 hover:text-[#f5e6c8] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToCart}
              disabled={!isMandatoryFulfilled()}
              className="flex-1 bg-[#e8a33d] text-[#1a0f0c] font-extrabold py-3.5 rounded-2xl hover:bg-amber-400 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              Add to Cart
            </button>
          </div>
          {!isMandatoryFulfilled() && (
            <p className="text-center text-[#6b4e37] text-xs mt-2">Please select all required options (*)</p>
          )}
        </div>
      </div>
    </div>
  );
}