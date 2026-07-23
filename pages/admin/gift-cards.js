'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

const API_SECRET = process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '';

export default function AdminGiftCards() {
  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState('');
  const [detail, setDetail] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function fetchCards() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/gift-cards?search=${encodeURIComponent(search)}`, {
        headers: { 'x-employee-secret': API_SECRET },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load gift cards');
      setCards(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message || 'Failed to load gift cards');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCards();
  }, []);

  async function loadDetail(code) {
    setSelectedCode(code);
    const res = await fetch(`/api/admin/gift-cards?code=${encodeURIComponent(code)}`, {
      headers: { 'x-employee-secret': API_SECRET },
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Failed to load gift card detail');
      return;
    }
    setDetail(data);
  }

  async function runAction(action, payload = {}) {
    if (!selectedCode) return;
    setMessage('');
    const res = await fetch('/api/admin/gift-cards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-employee-secret': API_SECRET,
      },
      body: JSON.stringify({
        action,
        code: selectedCode,
        ...payload,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Action failed');
      return;
    }
    setMessage('Updated successfully');
    await fetchCards();
    await loadDetail(selectedCode);
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-7xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-2">Gift Card Management</h1>
          <p className="text-gray-500 mb-6">Review balances, redemption history, and control card status.</p>

          {message && <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div>}

          <div className="mb-4 flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or email"
              className="flex-1 border rounded px-3 py-2"
            />
            <button onClick={fetchCards} className="bg-primary text-white px-4 py-2 rounded">Search</button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-left">Recipient</th>
                    <th className="p-3 text-right">Balance</th>
                    <th className="p-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card) => (
                    <tr
                      key={card._id}
                      onClick={() => loadDetail(card.code)}
                      className={`border-t cursor-pointer hover:bg-gray-50 ${selectedCode === card.code ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-3 font-semibold">{card.code}</td>
                      <td className="p-3">{card.recipientEmail || '—'}</td>
                      <td className="p-3 text-right">${Number(card.balance || 0).toFixed(2)}</td>
                      <td className="p-3 capitalize">{card.status}</td>
                    </tr>
                  ))}
                  {!loading && cards.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">No cards found.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              {!detail ? (
                <p className="text-gray-400">Select a card to view details.</p>
              ) : (
                <>
                  <h2 className="text-xl font-semibold">{detail.card.code}</h2>
                  <p className="text-sm text-gray-500 mt-1">{detail.card.recipientName || 'Recipient'} · {detail.card.recipientEmail || 'No email'}</p>
                  <div className="mt-3 text-sm space-y-1">
                    <p><strong>Balance:</strong> ${Number(detail.card.balance || 0).toFixed(2)}</p>
                    <p><strong>Initial:</strong> ${Number(detail.card.initialAmount || 0).toFixed(2)}</p>
                    <p><strong>Status:</strong> {detail.card.status}</p>
                    <p><strong>Delivery:</strong> {detail.card.deliveryStatus}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => runAction('lock')} className="border rounded px-3 py-2 text-sm">Lock</button>
                    <button onClick={() => runAction('unlock')} className="border rounded px-3 py-2 text-sm">Unlock</button>
                    <button onClick={() => runAction('resend')} className="border rounded px-3 py-2 text-sm col-span-2">Resend Email</button>
                  </div>

                  <div className="mt-5 border-t pt-4">
                    <h3 className="font-semibold mb-2">Manual Adjustment</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        placeholder="e.g. 10 or -5"
                        className="border rounded px-3 py-2 text-sm"
                      />
                      <input
                        value={adjustNote}
                        onChange={(e) => setAdjustNote(e.target.value)}
                        placeholder="Reason"
                        className="border rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => runAction('adjust', { amount: Number(adjustAmount), note: adjustNote })}
                      className="mt-2 bg-primary text-white px-4 py-2 rounded text-sm"
                    >
                      Apply Adjustment
                    </button>
                  </div>

                  <div className="mt-5 border-t pt-4">
                    <h3 className="font-semibold mb-2">Transactions</h3>
                    <div className="max-h-72 overflow-y-auto space-y-2">
                      {detail.transactions.map((tx) => (
                        <div key={tx._id} className="border rounded p-2 text-xs">
                          <div className="flex justify-between">
                            <span className="font-semibold">{tx.type} ({tx.channel})</span>
                            <span>{new Date(tx.createdAt).toLocaleString()}</span>
                          </div>
                          <div>Amount: {tx.amount >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2)} | Balance: ${Number(tx.balanceBefore).toFixed(2)} → ${Number(tx.balanceAfter).toFixed(2)}</div>
                          {tx.note && <div className="text-gray-600">{tx.note}</div>}
                        </div>
                      ))}
                      {detail.transactions.length === 0 && <p className="text-gray-400 text-sm">No transactions yet.</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
