import { useState } from 'react';
import Link from 'next/link';

const API_SECRET = process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '';

export default function EmployeeGiftCards() {
  const [assignedId, setAssignedId] = useState('');
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [lookup, setLookup] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function checkCard() {
    setMessage('');
    const normalized = code.trim();
    if (!normalized) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/gift-cards?code=${encodeURIComponent(normalized)}`, {
        headers: { 'x-employee-secret': API_SECRET },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to check gift card');
      setLookup(data);
    } catch (error) {
      setLookup(null);
      setMessage(error.message || 'Unable to check gift card');
    } finally {
      setLoading(false);
    }
  }

  async function redeemCard() {
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/employees/gift-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-secret': API_SECRET,
        },
        body: JSON.stringify({
          assignedId: assignedId.trim(),
          code: code.trim(),
          amount: Number(amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to redeem');
      setLookup(data.card);
      setAmount('');
      setMessage(`Redeemed successfully. Remaining balance: $${Number(data.card.balance || 0).toFixed(2)}`);
    } catch (error) {
      setMessage(error.message || 'Unable to redeem');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-lg p-8">
        <p className="text-sm text-indigo-600 font-semibold uppercase tracking-[0.3em]">Employee Gift Cards</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Redeem Gift Card</h1>
        <p className="mt-2 text-slate-600 text-sm">Use this in-store to check balance and redeem customer gift cards.</p>

        <div className="mt-6 space-y-4">
          <input
            value={assignedId}
            onChange={(e) => setAssignedId(e.target.value)}
            placeholder="Your Assigned Employee ID"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
          />

          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Gift Card Code"
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm uppercase"
            />
            <button
              type="button"
              onClick={checkCard}
              disabled={loading || !code.trim()}
              className="rounded-2xl bg-indigo-600 text-white px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              Check
            </button>
          </div>

          {lookup && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p><strong>Card:</strong> {lookup.code}</p>
              <p><strong>Status:</strong> {lookup.status}</p>
              <p><strong>Balance:</strong> ${Number(lookup.balance || 0).toFixed(2)}</p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Redeem Amount"
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
            <button
              type="button"
              onClick={redeemCard}
              disabled={loading || !assignedId.trim() || !code.trim() || !amount}
              className="rounded-2xl bg-emerald-600 text-white px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              Redeem
            </button>
          </div>

          {message && <div className="rounded-2xl px-4 py-3 text-sm bg-slate-100 text-slate-700">{message}</div>}

          {!API_SECRET && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              This page requires <code>NEXT_PUBLIC_EMPLOYEE_API_SECRET</code> in environment variables.
            </div>
          )}

          <Link href="/employee" className="inline-block text-sm text-indigo-600 underline">← Back to Employee Clock</Link>
        </div>
      </div>
    </div>
  );
}
