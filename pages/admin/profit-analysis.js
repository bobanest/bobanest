'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';

const fmt = (n) => `$${(n == null ? 0 : Number(n)).toFixed(2)}`;
const pct = (n) => n == null ? '—' : `${Number(n).toFixed(1)}%`;

const CATEGORY_LABELS = {
  ingredients: 'Ingredients',
  packaging: 'Packaging',
  equipment: 'Equipment',
  rent: 'Rent',
  utilities: 'Utilities',
  marketing: 'Marketing',
  labor: 'Labor',
  other: 'Other',
};

const CATEGORY_COLORS = {
  ingredients: 'bg-green-500',
  packaging: 'bg-blue-400',
  equipment: 'bg-purple-500',
  rent: 'bg-orange-500',
  utilities: 'bg-yellow-400',
  marketing: 'bg-pink-500',
  labor: 'bg-indigo-500',
  other: 'bg-gray-400',
};

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function KPICard({ label, value, sub, color = 'text-gray-800', bg = 'bg-white' }) {
  return (
    <div className={`${bg} rounded-xl shadow p-5`}>
      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function marginColor(val) {
  if (val == null) return 'text-gray-400';
  if (val >= 60) return 'text-green-600';
  if (val >= 30) return 'text-yellow-600';
  return 'text-red-500';
}

export default function ProfitAnalysis() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/profit-analysis?month=${month}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month]);

  const s = data?.summary || {};
  const daily = data?.daily || [];
  const topProducts = data?.topProducts || [];
  const expCat = data?.expenseByCategory || {};

  const maxRevenue = Math.max(...daily.map(d => d.revenue), 1);
  const maxExpense = Math.max(...Object.values(expCat), 1);

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Profit Analysis</h1>
              <p className="text-gray-500 text-sm mt-1">Revenue, costs, and net profit for the selected month</p>
            </div>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {loading ? (
            <p className="text-gray-400 py-12 text-center">Loading...</p>
          ) : !data ? (
            <p className="text-red-500 py-12 text-center">Failed to load data.</p>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <KPICard
                  label="Total Revenue"
                  value={fmt(s.totalRevenue)}
                  sub={`${s.ordersCount} orders · ${s.walkInsCount} walk-ins`}
                  color="text-blue-600"
                />
                <KPICard
                  label="Est. COGS"
                  value={fmt(s.trackedCOGS)}
                  sub="Ingredient cost (recipe-tracked)"
                  color="text-orange-500"
                />
                <KPICard
                  label="Gross Profit"
                  value={fmt(s.grossProfit)}
                  sub={`Margin: ${pct(s.grossMargin)}`}
                  color={s.grossProfit >= 0 ? 'text-green-600' : 'text-red-500'}
                />
                <KPICard
                  label="Operating Expenses"
                  value={fmt(s.totalExpenses)}
                  sub="From expense log"
                  color="text-red-500"
                />
                <KPICard
                  label="Net Profit"
                  value={fmt(s.netProfit)}
                  sub={`Net margin: ${pct(s.netMargin)}`}
                  color={s.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}
                  bg={s.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}
                />
                <KPICard
                  label="Net Margin"
                  value={pct(s.netMargin)}
                  sub="Net profit ÷ revenue"
                  color={marginColor(s.netMargin)}
                />
              </div>

              {/* Revenue breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow p-5">
                  <h2 className="font-bold text-lg mb-4">Revenue Breakdown</h2>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Online Orders</span>
                        <span className="font-semibold">{fmt(s.onlineRevenue)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                          className="h-3 bg-blue-500 rounded-full"
                          style={{ width: s.totalRevenue > 0 ? `${(s.onlineRevenue / s.totalRevenue) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Walk-in Sales</span>
                        <span className="font-semibold">{fmt(s.walkInRevenue)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                          className="h-3 bg-purple-500 rounded-full"
                          style={{ width: s.totalRevenue > 0 ? `${(s.walkInRevenue / s.totalRevenue) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                    <div className="pt-2 border-t flex justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span>{fmt(s.totalRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* Expense by category */}
                <div className="bg-white rounded-xl shadow p-5">
                  <h2 className="font-bold text-lg mb-4">Expenses by Category</h2>
                  {Object.keys(expCat).length === 0 ? (
                    <p className="text-gray-400 text-sm">No expenses logged this month.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(expCat)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, amount]) => (
                          <div key={cat}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">{CATEGORY_LABELS[cat] || cat}</span>
                              <span className="font-semibold">{fmt(amount)}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full ${CATEGORY_COLORS[cat] || 'bg-gray-400'}`}
                                style={{ width: `${Math.max(3, (amount / maxExpense) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      <div className="pt-2 border-t flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span>{fmt(s.totalExpenses)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Profit waterfall summary */}
              <div className="bg-white rounded-xl shadow p-5 mb-6">
                <h2 className="font-bold text-lg mb-4">Profit Waterfall</h2>
                <div className="space-y-2 max-w-md">
                  {[
                    { label: 'Total Revenue', value: s.totalRevenue, color: 'bg-blue-500' },
                    { label: '− Est. COGS', value: -s.trackedCOGS, color: 'bg-orange-400' },
                    { label: '= Gross Profit', value: s.grossProfit, color: s.grossProfit >= 0 ? 'bg-green-500' : 'bg-red-400', bold: true },
                    { label: '− Operating Expenses', value: -s.totalExpenses, color: 'bg-red-400' },
                    { label: '= Net Profit', value: s.netProfit, color: s.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600', bold: true },
                  ].map(row => (
                    <div key={row.label} className={`flex items-center gap-3 text-sm ${row.bold ? 'font-bold' : ''}`}>
                      <span className="w-44 text-gray-700">{row.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-4 rounded-full ${row.color}`}
                          style={{ width: `${Math.max(2, (Math.abs(row.value) / (s.totalRevenue || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className={`w-24 text-right ${row.value < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                        {row.value < 0 ? `−${fmt(Math.abs(row.value))}` : fmt(row.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily revenue vs profit */}
              {daily.length > 0 && (
                <div className="bg-white rounded-xl shadow p-5 mb-6 overflow-x-auto">
                  <h2 className="font-bold text-lg mb-4">Daily Revenue &amp; Profit</h2>
                  <div className="flex items-end gap-1 min-w-max" style={{ height: 140 }}>
                    {daily.map(d => {
                      const revH = Math.round((d.revenue / maxRevenue) * 120);
                      const profH = d.profit > 0 ? Math.round((d.profit / maxRevenue) * 120) : 0;
                      const dayLabel = new Date(d.date + 'T00:00:00').getDate();
                      return (
                        <div key={d.date} className="flex flex-col items-center gap-0.5" title={`${d.date}\nRevenue: ${fmt(d.revenue)}\nProfit: ${fmt(d.profit)}`}>
                          <div className="flex items-end gap-0.5" style={{ height: 125 }}>
                            <div className="w-5 bg-blue-300 rounded-t" style={{ height: revH || 2 }} />
                            <div className="w-5 bg-green-400 rounded-t" style={{ height: profH || 0 }} />
                          </div>
                          <span className="text-xs text-gray-400">{dayLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-300 rounded inline-block" /> Revenue</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded inline-block" /> Net Profit</span>
                  </div>
                </div>
              )}

              {/* Top products */}
              {topProducts.length > 0 && (
                <div className="bg-white rounded-xl shadow p-5">
                  <h2 className="font-bold text-lg mb-4">Top Products by Gross Profit</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2 pr-4">Product</th>
                          <th className="pb-2 pr-4 text-right">Units Sold</th>
                          <th className="pb-2 pr-4 text-right">Revenue</th>
                          <th className="pb-2 pr-4 text-right">Est. COGS</th>
                          <th className="pb-2 pr-4 text-right">Gross Profit</th>
                          <th className="pb-2 text-right">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((p, i) => {
                          const margin = p.revenue > 0 ? ((p.grossProfit / p.revenue) * 100) : null;
                          return (
                            <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-2 pr-4 font-medium">
                                {p.name}
                                {!p.cogsTracked && (
                                  <span className="ml-1 text-xs text-yellow-500" title="No recipe or missing ingredient cost">⚠</span>
                                )}
                              </td>
                              <td className="py-2 pr-4 text-right text-gray-600">{p.unitsSold}</td>
                              <td className="py-2 pr-4 text-right">{fmt(p.revenue)}</td>
                              <td className="py-2 pr-4 text-right text-orange-500">
                                {p.cogsTracked ? fmt(p.cogs) : '—'}
                              </td>
                              <td className={`py-2 pr-4 text-right font-semibold ${p.grossProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {p.cogsTracked ? fmt(p.grossProfit) : '—'}
                              </td>
                              <td className={`py-2 text-right font-semibold ${marginColor(margin)}`}>
                                {p.cogsTracked ? pct(margin) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-400 mt-3">
                      ⚠ = product has no recipe or missing ingredient cost. Set up recipes and inventory costs for full COGS tracking.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
