import Layout from '@/components/Layout';
import { useState, useEffect } from 'react';
import { useCart } from '@/components/CartContext';
import Link from 'next/link';

const SESSION_KEY = 'bobanest_loyalty_session';
const SESSION_TTL = 60 * 60 * 1000; // 1 hour in ms

const POINTS_PER_REWARD = 100;
const REWARD_VALUE = 5;

function getTier(points) {
  if (points >= 1000) return { name: 'Gold', emoji: '🥇', color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-300', next: null };
  if (points >= 500) return { name: 'Silver', emoji: '🥈', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-300', next: { name: 'Gold', need: 1000 - points } };
  return { name: 'Bronze', emoji: '🥉', color: 'text-orange-400', bg: 'bg-orange-50 border-orange-300', next: { name: 'Silver', need: 500 - points } };
}

export default function Loyalty() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [codeInput, setCodeInput] = useState('');
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reorderSuccess, setReorderSuccess] = useState('');
  const { addToCart, clearCart } = useCart();

  // Auto-load if a valid session exists in localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (!session.email || !session.verifiedAt) return;
      if (Date.now() - session.verifiedAt > SESSION_TTL) {
        localStorage.removeItem(SESSION_KEY);
        return;
      }
      // Session still valid — reload data silently
      setEmail(session.email);
      loadVerifiedData(session.email);
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const loadVerifiedData = async (verifiedEmail) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/loyalty/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifiedEmail }),
      });
      if (!res.ok) { localStorage.removeItem(SESSION_KEY); return; }
      const data = await res.json();
      setCustomer(data.customer);
      setOrders(data.orders || []);
    } catch {
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(SESSION_KEY);
    setCustomer(null);
    setOrders([]);
    setEmail('');
    setStep('email');
    setError('');
  };

  const handleSendCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/loyalty/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ? `${data.error}: ${data.detail}` : (data.error || 'Failed to send code'));
      setStep('code');
      setCodeInput('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/loyalty/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      // Persist session for 1 hour
      localStorage.setItem(SESSION_KEY, JSON.stringify({ email, verifiedAt: Date.now() }));
      setCustomer(data.customer);
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = (order) => {
    clearCart();
    order.items.forEach(item => {
      addToCart({
        id: item._id || item.name,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        modifiers: item.modifiers || [],
        imageUrl: item.imageUrl || '',
      });
    });
    setReorderSuccess(`Order #${order.trackingNumber} added to cart!`);
    setTimeout(() => setReorderSuccess(''), 4000);
  };

  const tier = customer ? getTier(customer.points) : null;
  const redeemableRewards = customer ? Math.floor(customer.points / POINTS_PER_REWARD) : 0;
  const pointsToNext = customer ? (POINTS_PER_REWARD - (customer.points % POINTS_PER_REWARD)) : 0;

  return (
    <Layout title="Loyalty Rewards – Bobanest">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-center mb-2">Bobanest Rewards</h1>
        <p className="text-center text-gray-500 mb-8">
          Earn 1 point for every $1 spent. {POINTS_PER_REWARD} points = ${REWARD_VALUE} off your next order!
        </p>

        {/* Tier explanation */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { name: 'Bronze', emoji: '🥉', color: 'text-orange-400', range: '0–499 pts' },
            { name: 'Silver', emoji: '🥈', color: 'text-gray-500', range: '500–999 pts' },
            { name: 'Gold', emoji: '🥇', color: 'text-yellow-500', range: '1000+ pts' },
          ].map(t => (
            <div key={t.name} className="text-center p-4 bg-white rounded-lg shadow">
              <div className="text-3xl mb-1">{t.emoji}</div>
              <div className={`font-bold ${t.color}`}>{t.name}</div>
              <div className="text-xs text-gray-400">{t.range}</div>
            </div>
          ))}
        </div>

        {/* Verification form — only shown when not yet verified */}
        {!customer && (
          <>
        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="flex gap-2 mb-6">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 border p-2 rounded"
              required
            />
            <button type="submit" className="btn-primary whitespace-nowrap" disabled={sending}>
              {sending ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        ) : (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-3 text-center">
              A 6-digit code was sent to <strong>{email}</strong>
            </p>
            <form onSubmit={handleVerify} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit code"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="flex-1 border p-2 rounded tracking-widest text-center text-xl font-mono"
                maxLength={6}
                required
              />
              <button type="submit" className="btn-primary whitespace-nowrap" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </form>
            <div className="flex justify-between mt-2">
              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); setCodeInput(''); }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ← Change email
              </button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sending}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Resend code'}
              </button>
            </div>
          </div>
        )}
          </>
        )}

        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>}
        {reorderSuccess && <div className="bg-green-50 text-green-700 p-3 rounded mb-4">✓ {reorderSuccess} <Link href="/cart" className="underline font-semibold">Go to cart →</Link></div>}

        {customer && tier && (
          <>
            {/* Sign out */}
            <div className="flex justify-end mb-4">
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-400 hover:text-gray-600 underline"
              >
                Not you? Sign out
              </button>
            </div>

            {/* Points Card */}
            <div className={`rounded-xl border-2 p-6 mb-8 ${tier.bg}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Member</p>
                  <p className="font-bold text-lg">{customer.name || customer.email}</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${tier.color}`}>{tier.emoji} {tier.name}</div>
                </div>
              </div>

              <div className="text-center mb-4">
                <p className="text-5xl font-bold text-primary">{customer.points}</p>
                <p className="text-gray-500 text-sm">points</p>
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (customer.points % POINTS_PER_REWARD) / POINTS_PER_REWARD * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">{pointsToNext} pts until next ${REWARD_VALUE} reward</p>
              </div>

              {tier.next && (
                <p className="text-xs text-center text-gray-500">{tier.next.need} more points to reach {tier.next.name}</p>
              )}

              {redeemableRewards > 0 && (
                <div className="mt-4 bg-white rounded-lg p-3 text-center">
                  <p className="font-semibold text-green-700">🎉 You have {redeemableRewards} reward{redeemableRewards > 1 ? 's' : ''} available!</p>
                  <p className="text-sm text-gray-500">{redeemableRewards} × ${REWARD_VALUE} = ${redeemableRewards * REWARD_VALUE} off</p>
                  <Link href="/cart" className="inline-block mt-2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Redeem at Checkout →
                  </Link>
                </div>
              )}
            </div>

            {/* Referral Program Card */}
            {customer.referralCode && (
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border-2 border-pink-200 p-6 mb-8">
                <h2 className="text-lg font-bold mb-1">🎁 Give $5, Get $5</h2>
                <p className="text-sm text-gray-600 mb-4">Share your referral code. When a friend places their first order, you both earn 100 points ($5 off)!</p>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-white border-2 border-pink-300 rounded-lg py-3 px-4 text-center">
                    <span className="text-2xl font-bold tracking-widest text-primary">{customer.referralCode}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(customer.referralCode);
                    }}
                    className="bg-primary text-white px-4 py-3 rounded-lg text-sm font-semibold hover:opacity-90"
                  >
                    Copy
                  </button>
                  {navigator?.share && (
                    <button
                      onClick={() => navigator.share({ title: 'Bobanest Referral', text: `Use my code ${customer.referralCode} at Bobanest for $5 off your first order!`, url: 'https://bobanest.vercel.app' })}
                      className="bg-secondary text-white px-4 py-3 rounded-lg text-sm font-semibold hover:opacity-90"
                    >
                      Share
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3">Share link: bobanest.vercel.app/cart — enter code at checkout</p>
              </div>
            )}

            {/* Saved Favorites */}
            {customer.favoriteOrders && customer.favoriteOrders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">⭐ Saved Favorite Orders</h2>
                <div className="space-y-3">
                  {customer.favoriteOrders.map(fav => (
                    <div key={fav._id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{fav.label}</p>
                        <p className="text-sm text-gray-500">{fav.items.length} item{fav.items.length !== 1 ? 's' : ''}: {fav.items.map(i => i.name).join(', ')}</p>
                      </div>
                      <button
                        onClick={() => handleReorder({ trackingNumber: fav.label, items: fav.items })}
                        className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold"
                      >
                        Reorder
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order History */}
            <div>
              <h2 className="text-xl font-bold mb-4">📋 Order History</h2>
              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders yet. <Link href="/products" className="text-primary underline">Order now!</Link></p>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order._id} className="bg-white rounded-lg shadow p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold">#{order.trackingNumber}</p>
                          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()} · {order.orderType}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">${order.totalAmount?.toFixed(2)}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</p>
                      <button
                        onClick={() => handleReorder(order)}
                        className="text-sm bg-secondary text-white px-4 py-1.5 rounded-full hover:bg-primary transition"
                      >
                        Reorder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}