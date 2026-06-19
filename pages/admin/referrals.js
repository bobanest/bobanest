'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminReferrals() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get('/api/admin/referrals')
      .then(res => setData(res.data))
      .catch(err => console.error('Failed to load referrals', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data?.referrers.filter(r =>
    (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase()) ||
    r.referralCode.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Referral Tracking</h1>
          <p className="text-gray-500 mb-6">Track how customers are referring their friends</p>

          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : !data ? (
            <p className="text-red-500">Failed to load data.</p>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Referrers', value: data.totalReferrers },
                  { label: 'Customers Referred', value: data.totalReferred },
                  { label: 'Orders via Referrals', value: data.totalReferralOrders },
                  {
                    label: 'Revenue from Referrals',
                    value: `$${(data.totalReferralRevenue || 0).toFixed(2)}`,
                  },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-lg shadow p-4">
                    <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search by name, email or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border p-2 rounded mb-4 text-sm max-w-md"
              />

              {/* Referrers table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Referrer</th>
                      <th className="text-left p-3">Code</th>
                      <th className="text-right p-3">Referrals</th>
                      <th className="text-right p-3">Orders Generated</th>
                      <th className="text-right p-3">Revenue Generated</th>
                      <th className="text-right p-3">Loyalty Points</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-gray-400">
                          No referrers found.
                        </td>
                      </tr>
                    ) : (
                      filtered.map(referrer => (
                        <>
                          <tr
                            key={referrer._id}
                            className="border-t hover:bg-gray-50 cursor-pointer"
                            onClick={() =>
                              setExpanded(expanded === referrer._id ? null : referrer._id)
                            }
                          >
                            <td className="p-3">
                              <p className="font-medium">{referrer.name || '—'}</p>
                              <p className="text-xs text-gray-400">{referrer.email}</p>
                            </td>
                            <td className="p-3">
                              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {referrer.referralCode}
                              </span>
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {referrer.referralCount}
                            </td>
                            <td className="p-3 text-right">{referrer.ordersFromReferrals}</td>
                            <td className="p-3 text-right">
                              ${(referrer.revenueFromReferrals || 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-right">{referrer.points}</td>
                            <td className="p-3 text-right text-gray-400 text-xs">
                              {referrer.referralCount > 0
                                ? expanded === referrer._id
                                  ? '▲ Hide'
                                  : '▼ Show'
                                : ''}
                            </td>
                          </tr>
                          {expanded === referrer._id && referrer.referredCustomers.length > 0 && (
                            <tr key={`${referrer._id}-detail`} className="bg-blue-50 border-t">
                              <td colSpan={7} className="p-4">
                                <p className="text-xs font-semibold text-gray-600 mb-2">
                                  Referred customers:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {referrer.referredCustomers.map(c => (
                                    <div
                                      key={c._id}
                                      className="bg-white rounded px-3 py-2 text-sm border border-blue-100"
                                    >
                                      <p className="font-medium">{c.name || c.email}</p>
                                      {c.name && (
                                        <p className="text-xs text-gray-400">{c.email}</p>
                                      )}
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        Joined {new Date(c.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
