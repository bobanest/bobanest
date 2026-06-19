'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';

function StatCard({ label, value, sub, color = 'text-primary' }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ data, valueKey, labelKey, max }) {
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="w-36 truncate text-gray-700">{d[labelKey]}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-4 bg-primary rounded-full"
              style={{ width: `${Math.max(3, (d[valueKey] / max) * 100)}%` }}
            />
          </div>
          <span className="w-20 text-right text-gray-600 font-semibold">{d.revenueLabel ?? d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  const fmt = (n) => `$${(n || 0).toFixed(2)}`;

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Sales Analytics</h1>
            <select value={range} onChange={e => setRange(Number(e.target.value))} className="border p-2 rounded text-sm">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 12 months</option>
            </select>
          </div>

          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : !data ? (
            <p className="text-red-500">Failed to load data.</p>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Today's Revenue" value={fmt(data.todayRevenue)} sub={`${data.todayOrders} orders`} color="text-green-600" />
                <StatCard label="This Month" value={fmt(data.monthRevenue)} sub={`${data.monthOrders} orders`} color="text-blue-600" />
                <StatCard label={`Last ${range} Days`} value={fmt(data.totalRevenue)} sub={`${data.totalOrders} orders`} />
                <StatCard label="All-Time Revenue" value={fmt(data.allTimeRevenue)} sub={`Avg ${fmt(data.avgOrderValue)}/order`} color="text-purple-600" />
              </div>

              {/* Revenue chart */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="font-bold text-lg mb-4">Revenue by Day</h2>
                {data.revenueByDay.length === 0 ? (
                  <p className="text-gray-400 text-sm">No paid orders in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="flex items-end gap-1 h-40 min-w-max">
                      {data.revenueByDay.map((d, i) => {
                        const maxRev = Math.max(...data.revenueByDay.map(x => x.revenue));
                        const pct = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0;
                        return (
                          <div key={i} className="flex flex-col items-center group">
                            <div className="relative">
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-dark text-white text-xs px-1 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                ${d.revenue.toFixed(0)} ({d.orders})
                              </div>
                              <div
                                className="w-6 bg-primary rounded-t hover:bg-secondary transition-colors"
                                style={{ height: `${Math.max(4, pct * 1.3)}px` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 mt-1 rotate-45 origin-left">{d.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Top products */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="font-bold text-lg mb-4">Top Products by Revenue</h2>
                  {data.topProducts.length === 0 ? (
                    <p className="text-gray-400 text-sm">No data yet.</p>
                  ) : (
                    <MiniBar
                      data={data.topProducts.map(p => ({ ...p, revenueLabel: `$${p.revenue.toFixed(0)}` }))}
                      valueKey="revenue"
                      labelKey="name"
                      max={Math.max(...data.topProducts.map(p => p.revenue))}
                    />
                  )}
                </div>

                {/* Orders by status */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="font-bold text-lg mb-4">All-Time Orders by Status</h2>
                  <div className="space-y-3">
                    {Object.entries(data.ordersByStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className="capitalize text-sm text-gray-700">{status}</span>
                        <span className="font-bold text-sm bg-gray-100 px-3 py-1 rounded-full">{count}</span>
                      </div>
                    ))}
                    {Object.keys(data.ordersByStatus).length === 0 && <p className="text-gray-400 text-sm">No orders yet.</p>}
                  </div>
                </div>
              </div>

              {/* Top products table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b"><h2 className="font-bold text-lg">Product Performance (Last {range} days)</h2></div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Product</th>
                      <th className="text-right p-3">Units Sold</th>
                      <th className="text-right p-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="p-3">{p.name}</td>
                        <td className="p-3 text-right text-gray-600">{p.quantity}</td>
                        <td className="p-3 text-right font-semibold text-green-600">${p.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                    {data.topProducts.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-gray-400">No data yet.</td></tr>}
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
