'use client';

import Layout from '@/components/Layout';
import { useCart } from '@/components/CartContext';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { useState, useEffect } from 'react';
import { trackInitiateCheckout } from '@/lib/facebookTracking';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Minimum scheduled time: now + 30 minutes, in steps of 15 min
function getMinScheduledTime() {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  d.setSeconds(0, 0);
  const mins = d.getMinutes();
  const rounded = Math.ceil(mins / 15) * 15;
  d.setMinutes(rounded);
  return d;
}

function toDatetimeLocal(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Check if a datetime-local string falls within store open hours
function checkScheduledOpen(storeInfoData, datetimeStr) {
  if (!storeInfoData || !datetimeStr) return true;
  const dt = new Date(datetimeStr);
  if (isNaN(dt.getTime())) return false;
  const tz = storeInfoData.timezone || 'America/New_York';
  const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(dt);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(dt);
  const h = parts.find(p => p.type === 'hour')?.value ?? '00';
  const m = parts.find(p => p.type === 'minute')?.value ?? '00';
  const timeStr = `${h === '24' ? '00' : h}:${m}`;
  const special = (storeInfoData.specialHours || []).find(s => s.date === localDateStr);
  if (special) {
    if (!special.isOpen) return false;
    return timeStr >= special.openTime && timeStr < special.closeTime;
  }
  const [y, mo, dd] = localDateStr.split('-').map(Number);
  const dow = new Date(y, mo - 1, dd).getDay();
  const dayH = (storeInfoData.weeklyHours || []).find(w => w.day === dow);
  if (!dayH || !dayH.isOpen) return false;
  return timeStr >= dayH.openTime && timeStr < dayH.closeTime;
}

function fmtTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, totalPrice, clearCart, addToCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [promotions, setPromotions] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [appliedPromotions, setAppliedPromotions] = useState([]);

  // New state: email, scheduling, loyalty, favorites
  const [customerEmail, setCustomerEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(toDatetimeLocal(getMinScheduledTime()));
  const [loyaltyPoints, setLoyaltyPoints] = useState(null); // null = not loaded
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [favoriteSaved, setFavoriteSaved] = useState(false);

  // Coupon code
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount, description }
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Referral code
  const [referralInput, setReferralInput] = useState('');
  const [referralValidated, setReferralValidated] = useState(null); // null | false | { referrerName }
  const [referralLoading, setReferralLoading] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null); // null = loading, treat as open

  const POINTS_PER_REWARD = 100;
  const REWARD_VALUE = 5;

  // Store open/closed status + scheduled time validity
  const storeIsOpen = storeInfo == null ? true : storeInfo.isOpen;
  const scheduledTimeOk = checkScheduledOpen(storeInfo, scheduledTime);

  const items = cartItems ?? [];
  const tax = totalPrice * 0.07;
  const deliveryFee = 0;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const finalTotal = Math.max(0, totalPrice + tax + deliveryFee - discount - loyaltyDiscount - couponDiscount);

  // Fetch active promotions
  useEffect(() => {
    fetch('/api/admin/promotions?active=true')
      .then(res => res.json())
      .then(data => setPromotions(data))
      .catch(() => {});
  }, []);

  // Fetch store hours
  useEffect(() => {
    fetch('/api/store-hours')
      .then(r => r.json())
      .then(d => setStoreInfo(d))
      .catch(() => {}); // fail open — don't block checkout if API fails
  }, []);

  // Auto-enable scheduling when store is currently closed
  useEffect(() => {
    if (storeInfo && !storeInfo.isOpen) setScheduleEnabled(true);
  }, [storeInfo]);

  // Apply promotions
  useEffect(() => {
    let discountAmount = 0;
    const applied = [];
    const now = new Date();

    promotions.forEach(promo => {
      if (promo.startDate && new Date(promo.startDate) > now) return;
      if (promo.endDate && new Date(promo.endDate) < now) return;
      if (!promo.isActive) return;

      const applicableProductIds = (promo.applicableProducts || []).map(p => p._id || p);
      const applicable = applicableProductIds.length === 0 ||
        items.some(item => applicableProductIds.includes(item.id));
      if (!applicable) return;

      if (promo.type === 'percentage' && totalPrice >= promo.minOrderAmount) {
        const amount = totalPrice * promo.value / 100;
        discountAmount += amount;
        applied.push({ promotionId: promo._id, name: promo.name, type: promo.type, discountAmount: amount });
      } else if (promo.type === 'fixed' && totalPrice >= promo.minOrderAmount) {
        discountAmount += promo.value;
        applied.push({ promotionId: promo._id, name: promo.name, type: promo.type, discountAmount: promo.value });
      } else if (promo.type === 'bogo') {
        const bogoItems = applicableProductIds.length === 0
          ? items.filter(i => i.quantity >= 2)
          : items.filter(i => applicableProductIds.includes(i.id) && i.quantity >= 2);
        if (bogoItems.length > 0) {
          let bogoDiscount = 0;
          bogoItems.forEach(item => { bogoDiscount += item.price * Math.floor(item.quantity / 2); });
          discountAmount += bogoDiscount;
          applied.push({ promotionId: promo._id, name: promo.name, type: promo.type, discountAmount: bogoDiscount });
        }
      } else if (promo.type === 'second_discount' && items.length >= 2) {
        const sorted = items.map(i => i.price).sort((a,b)=>a-b);
        const amount = sorted[1] * (promo.value / 100);
        discountAmount += amount;
        applied.push({ promotionId: promo._id, name: promo.name, type: promo.type, discountAmount: amount });
      }
    });
    setDiscount(Math.min(discountAmount, totalPrice));
    setAppliedPromotions(applied);
  }, [promotions, items, totalPrice]);

  // Load loyalty points & favorites when email is confirmed
  const loadCustomerData = async (email) => {
    if (!email) return;
    try {
      const res = await fetch(`/api/loyalty?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setLoyaltyPoints(data.points ?? 0);
      } else {
        setLoyaltyPoints(0);
      }
      const favRes = await fetch(`/api/customer/favorites?email=${encodeURIComponent(email)}`);
      if (favRes.ok) {
        const favData = await favRes.json();
        setFavorites(favData);
      }
      setFavoritesLoaded(true);
    } catch {
      setLoyaltyPoints(0);
      setFavoritesLoaded(true);
    }
  };

  const handleEmailSave = () => {
    if (!customerEmail || !/\S+@\S+\.\S+/.test(customerEmail)) {
      setError('Please enter a valid email');
      return;
    }
    setError('');
    setEmailSaved(true);
    loadCustomerData(customerEmail);
  };

  // Loyalty points redemption
  const redeemableRewards = loyaltyPoints !== null ? Math.floor(loyaltyPoints / POINTS_PER_REWARD) : 0;
  const maxRedeemDiscount = redeemableRewards * REWARD_VALUE;

  const handleRedeemPoints = (rewards) => {
    const pts = rewards * POINTS_PER_REWARD;
    const disc = rewards * REWARD_VALUE;
    setLoyaltyPointsToRedeem(pts);
    setLoyaltyDiscount(disc);
  };

  // Save cart as favorite
  const handleSaveFavorite = async () => {
    if (!customerEmail || !saveLabel.trim()) return;
    setSavingFavorite(true);
    try {
      const res = await fetch('/api/customer/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customerEmail,
          label: saveLabel.trim(),
          items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, imageUrl: i.imageUrl, modifiers: i.modifiers, id: i.id || i._id })),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFavorites(updated);
        setSaveLabel('');
        setFavoriteSaved(true);
        setTimeout(() => setFavoriteSaved(false), 3000);
      }
    } finally {
      setSavingFavorite(false);
    }
  };

  // Load a favorite into cart
  const handleLoadFavorite = (fav) => {
    clearCart();
    fav.items.forEach(item => addToCart({ ...item, id: item.id || item._id }));
  };

  // Delete a favorite
  const handleDeleteFavorite = async (favId) => {
    const res = await fetch('/api/customer/favorites', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: customerEmail, favoriteId: favId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setFavorites(updated);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setAppliedCoupon(null);
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), orderTotal: totalPrice }),
      });
      const data = await res.json();
      if (!data.valid) {
        setCouponError(data.error || 'Invalid code');
      } else {
        setAppliedCoupon({ code: data.code, discount: data.discount, description: data.description });
      }
    } catch {
      setCouponError('Failed to validate code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleValidateReferral = async () => {
    if (!referralInput.trim()) return;
    setReferralLoading(true);
    setReferralValidated(null);
    try {
      const res = await fetch(`/api/referral?code=${encodeURIComponent(referralInput.trim())}`);
      const data = await res.json();
      setReferralValidated(data.valid ? { referrerName: data.referrerName } : false);
    } catch {
      setReferralValidated(false);
    } finally {
      setReferralLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (!customerPhone.trim()) {
      setError('Please enter your phone number so we can contact you about your order');
      return;
    }

    // Track Facebook InitiateCheckout event
    trackInitiateCheckout(items, finalTotal);

    setCheckingOut(true);
    setError('');
    try {
      const cartItemsForStripe = items
        .filter(item => typeof item.price === 'number' && item.price >= 0)
        .map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          modifiers: item.modifiers || [],
        }));
      if (discount > 0) {
        cartItemsForStripe.push({ name: 'Discount', price: -discount, quantity: 1, modifiers: [] });
      }
      const response = await fetch('/api/cart/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItemsForStripe,
          orderType: 'pickup',
          deliveryAddress: '',
          appliedPromotions,
          couponCode: appliedCoupon ? appliedCoupon.code : null,
          referralCode: referralValidated ? referralInput.trim().toUpperCase() : null,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          scheduledTime: scheduleEnabled ? new Date(scheduledTime).toISOString() : null,
          loyaltyDiscount,
          loyaltyPointsUsed: loyaltyPointsToRedeem,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout failed');
      const stripe = await stripePromise;
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: data.id });
      if (stripeError) throw new Error(stripeError.message);
    } catch (err) {
      setError(err.message);
      setCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout title="Your Cart">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
          <Link href="/products" className="btn-primary">Browse Menu</Link>
          <div className="mt-6">
            <Link href="/loyalty" className="text-primary underline text-sm">View your loyalty rewards & order history</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Your Cart">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        {/* Closed banner */}
        {storeInfo && !storeInfo.isOpen && (
          <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🕐</span>
            <div>
              <p className="font-bold text-orange-800">We're currently closed</p>
              {storeInfo.reason && <p className="text-sm text-orange-700 mt-0.5">{storeInfo.reason}</p>}
              {storeInfo.todayOpen && (
                <p className="text-sm text-orange-700 mt-0.5">
                  Today: {fmtTime12(storeInfo.todayOpen)} – {fmtTime12(storeInfo.todayClose)}
                </p>
              )}
              <p className="text-sm text-orange-700 mt-1">You can still place your order — schedule a time below when we're open.</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            {items.map(item => (
              <div key={`${item.id}-${JSON.stringify(item.modifiers)}${item.isFreeBogo ? '-free' : ''}`} className="flex gap-4 border-b py-4">
                <img src={item.imageUrl} alt={item.name} className="w-24 h-24 object-cover rounded" />
                <div className="flex-grow">
                  <h3 className="font-bold">
                    {item.name}
                    {item.isFreeBogo && <span className="ml-2 text-green-600 text-xs font-semibold">(BOGO Free)</span>}
                  </h3>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-xs text-gray-500">{item.modifiers.map(m => m.options.join(', ')).join(', ')}</p>
                  )}
                  <p className={`text-primary ${item.isFreeBogo ? 'line-through text-gray-400' : ''}`}>
                    {item.isFreeBogo ? '$0.00' : `$${item.price.toFixed(2)}`}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.modifiers)} className="px-2 py-1 bg-gray-200 rounded" disabled={item.isFreeBogo}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.modifiers)} className="px-2 py-1 bg-gray-200 rounded" disabled={item.isFreeBogo}>+</button>
                    <button onClick={() => removeFromCart(item.id, item.modifiers)} className="text-red-500 ml-4">Remove</button>
                  </div>
                </div>
              </div>
            ))}

            {/* Save as Favorite */}
            {emailSaved && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-semibold text-sm mb-2">💾 Save this cart as a favorite order</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. My usual order"
                    value={saveLabel}
                    onChange={e => setSaveLabel(e.target.value)}
                    className="flex-1 border p-2 rounded text-sm"
                  />
                  <button
                    onClick={handleSaveFavorite}
                    disabled={savingFavorite || !saveLabel.trim()}
                    className="bg-yellow-400 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
                {favoriteSaved && <p className="text-green-600 text-sm mt-1">✓ Saved to favorites!</p>}
              </div>
            )}

            {/* Saved Favorites */}
            {emailSaved && favoritesLoaded && favorites.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-semibold text-sm mb-3">⭐ Your Saved Orders</p>
                <div className="space-y-2">
                  {favorites.map(fav => (
                    <div key={fav._id} className="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                      <span className="text-sm font-medium">{fav.label}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadFavorite(fav)}
                          className="text-xs bg-primary text-white px-3 py-1 rounded-full"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteFavorite(fav._id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
            <h2 className="text-xl font-bold">Order Summary</h2>

            {/* Email for loyalty & history */}
            <div>
              <label className="block font-semibold text-sm mb-1">Your Email <span className="text-gray-400 font-normal">(for rewards & history)</span></label>
              {!emailSaved ? (
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="flex-1 border p-2 rounded text-sm"
                  />
                  <button onClick={handleEmailSave} className="bg-primary text-white px-3 py-2 rounded text-sm">Apply</button>
                </div>
              ) : (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{customerEmail}</span>
                  <button onClick={() => { setEmailSaved(false); setLoyaltyPoints(null); setLoyaltyDiscount(0); setLoyaltyPointsToRedeem(0); }} className="text-xs text-primary underline">Change</button>
                </div>
              )}
            </div>

            {/* Phone number — required */}
            <div>
              <label className="block font-semibold text-sm mb-1">
                Phone Number <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">(we'll call before preparing your order)</span>
              </label>
              <input
                type="tel"
                placeholder="(555) 555-5555"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full border p-2 rounded text-sm"
              />
            </div>

            {/* Loyalty Points Redemption */}
            {emailSaved && loyaltyPoints !== null && (
              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                <p className="text-sm font-semibold text-purple-700">🏆 You have {loyaltyPoints} points</p>
                {redeemableRewards > 0 ? (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Redeem {POINTS_PER_REWARD} pts = ${REWARD_VALUE} off</p>
                    <div className="flex gap-2 items-center">
                      <select
                        className="border p-1 rounded text-sm flex-1"
                        value={loyaltyPointsToRedeem / POINTS_PER_REWARD}
                        onChange={e => handleRedeemPoints(parseInt(e.target.value))}
                      >
                        <option value={0}>Don't redeem</option>
                        {Array.from({ length: redeemableRewards }, (_, i) => i + 1).map(r => (
                          <option key={r} value={r}>{r * POINTS_PER_REWARD} pts = ${r * REWARD_VALUE} off</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">{POINTS_PER_REWARD - (loyaltyPoints % POINTS_PER_REWARD)} more pts for a ${REWARD_VALUE} reward</p>
                )}
              </div>
            )}

            {/* Order Type */}
            <div>
              <p className="font-semibold mb-2">Order Type</p>
              <p className="text-sm text-gray-700">Pickup only</p>
            </div>

            {/* Order Scheduling */}
            <div>
              <label className="flex items-center gap-2 font-semibold text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={e => {
                    // Can't uncheck when store is closed — must schedule
                    if (storeInfo && !storeInfo.isOpen) return;
                    setScheduleEnabled(e.target.checked);
                  }}
                />
                Schedule for later
                {storeInfo && !storeInfo.isOpen && (
                  <span className="text-orange-600 text-xs font-normal">(required — store is closed)</span>
                )}
              </label>
              {scheduleEnabled && (
                <div className="mt-2 space-y-2">
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    min={toDatetimeLocal(getMinScheduledTime())}
                    onChange={e => setScheduledTime(e.target.value)}
                    className={`w-full border p-2 rounded text-sm ${
                      scheduledTime && !scheduledTimeOk ? 'border-red-400 bg-red-50' : ''
                    }`}
                  />
                  {scheduledTime && !scheduledTimeOk && (
                    <p className="text-red-500 text-xs">⚠ We're not open at this time. Please pick a time within our hours.</p>
                  )}
                  {storeInfo?.weeklyHours?.length > 0 && (
                    <details className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                      <summary className="cursor-pointer font-medium">View our hours</summary>
                      <div className="mt-2 space-y-1">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((name, i) => {
                          const h = storeInfo.weeklyHours.find(w => w.day === i);
                          return (
                            <div key={i} className="flex justify-between">
                              <span>{name}</span>
                              <span className="text-gray-600">
                                {h?.isOpen ? `${fmtTime12(h.openTime)} – ${fmtTime12(h.closeTime)}` : 'Closed'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Promo / Referral accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setPromoOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-left hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  🏷️ Promo / Referral Code
                  {(appliedCoupon || (referralValidated && referralValidated.referrerName)) && (
                    <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">Applied</span>
                  )}
                </span>
                <span className={`text-gray-400 transition-transform duration-200 ${promoOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {promoOpen && (
                <div className="border-t px-4 py-4 space-y-4 bg-gray-50">
                  {/* Coupon Code */}
                  <div>
                    <label className="block font-semibold text-sm mb-1">Promo / Coupon Code</label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-300 rounded p-2 text-sm">
                        <span className="text-green-700 font-semibold">✓ {appliedCoupon.code} — -${appliedCoupon.discount.toFixed(2)} off</span>
                        <button onClick={() => { setAppliedCoupon(null); setCouponInput(''); }} className="text-xs text-gray-400 hover:text-red-500">Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter code"
                          value={couponInput}
                          onChange={e => setCouponInput(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                          className="flex-1 border p-2 rounded text-sm uppercase"
                        />
                        <button onClick={handleApplyCoupon} disabled={couponLoading || !couponInput.trim()} className="bg-secondary text-white px-3 py-2 rounded text-sm disabled:opacity-50">
                          {couponLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}
                    {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
                  </div>

                  {/* Referral Code */}
                  <div>
                    <label className="block font-semibold text-sm mb-1">Referral Code <span className="text-gray-400 font-normal">(first order gets $5 off!)</span></label>
                    {referralValidated && referralValidated.referrerName ? (
                      <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded p-2 text-sm">
                        <span className="text-purple-700 font-semibold">🎉 Referred by {referralValidated.referrerName}! You both get $5 after checkout.</span>
                        <button onClick={() => { setReferralValidated(null); setReferralInput(''); }} className="text-xs text-gray-400 hover:text-red-500">✕</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. BNXYZ123"
                          value={referralInput}
                          onChange={e => setReferralInput(e.target.value.toUpperCase())}
                          onKeyDown={e => e.key === 'Enter' && handleValidateReferral()}
                          className="flex-1 border p-2 rounded text-sm uppercase"
                        />
                        <button onClick={handleValidateReferral} disabled={referralLoading || !referralInput.trim()} className="bg-secondary text-white px-3 py-2 rounded text-sm disabled:opacity-50">
                          {referralLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}
                    {referralValidated === false && <p className="text-red-500 text-xs mt-1">Invalid referral code</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="pt-2 border-t space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>${totalPrice.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax (7%)</span><span>${tax.toFixed(2)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600"><span>Promo Discount</span><span>-${discount.toFixed(2)}</span></div>}
              {couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Coupon ({appliedCoupon.code})</span><span>-${couponDiscount.toFixed(2)}</span></div>}
              {loyaltyDiscount > 0 && <div className="flex justify-between text-purple-600"><span>Loyalty Reward</span><span>-${loyaltyDiscount.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total</span><span>${finalTotal.toFixed(2)}</span></div>
            </div>

            {scheduleEnabled && (
              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                📅 Scheduled for {new Date(scheduledTime).toLocaleString()}
              </p>
            )}

            <button
              onClick={handleCheckout}
              disabled={
                checkingOut ||
                (!storeIsOpen && (!scheduleEnabled || !scheduledTimeOk))
              }
              className="btn-primary w-full disabled:opacity-50"
            >
              {checkingOut ? 'Processing…'
                : !storeIsOpen && !scheduleEnabled ? 'Schedule Required (Store Closed)'
                : !storeIsOpen && !scheduledTimeOk ? 'Select a Valid Time'
                : 'Proceed to Checkout'}
            </button>
            <button onClick={clearCart} className="text-gray-500 text-sm w-full text-center">Clear Cart</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}