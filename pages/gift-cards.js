'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import Layout from '@/components/Layout';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function GiftCardsPage() {
  const [form, setForm] = useState({
    purchaserName: '',
    purchaserEmail: '',
    recipientName: '',
    recipientEmail: '',
    amount: 25,
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheckout(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/gift-cards/purchase-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to start gift card checkout');
      const stripe = await stripePromise;
      const result = await stripe.redirectToCheckout({ sessionId: data.id });
      if (result.error) throw new Error(result.error.message);
    } catch (err) {
      setError(err.message || 'Unable to start gift card checkout');
      setLoading(false);
    }
  }

  return (
    <Layout title="Virtual Gift Cards - Bobanest">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Virtual Gift Cards</h1>
        <p className="text-gray-600 mb-8">Buy online and send instantly by email. Redeem online or in-store.</p>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleCheckout} className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Your Name</label>
              <input
                required
                value={form.purchaserName}
                onChange={(e) => setForm({ ...form, purchaserName: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Your Email</label>
              <input
                type="email"
                required
                value={form.purchaserEmail}
                onChange={(e) => setForm({ ...form, purchaserEmail: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Recipient Name</label>
              <input
                required
                value={form.recipientName}
                onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recipient Email</label>
              <input
                type="email"
                required
                value={form.recipientEmail}
                onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount (USD)</label>
            <select
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className="w-full border rounded px-3 py-2"
            >
              {[10, 25, 50, 75, 100, 150, 200].map((v) => (
                <option key={v} value={v}>${v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message (optional)</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              maxLength={300}
              rows={4}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded-full py-3 font-semibold hover:bg-secondary disabled:opacity-60"
          >
            {loading ? 'Redirecting...' : `Buy Gift Card - $${Number(form.amount || 0).toFixed(2)}`}
          </button>
        </form>
      </div>
    </Layout>
  );
}
