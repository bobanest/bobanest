'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';

function toDateInput(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function NumberStat({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-primary mt-1">{value}</p>
      {sub ? <p className="text-xs text-gray-400 mt-1">{sub}</p> : null}
    </div>
  );
}

export default function Reports() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toDateInput(d);
  });
  const [toDate, setToDate] = useState(() => toDateInput(new Date()));
  const [productName, setProductName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        product: productName.trim(),
      });
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load reports');
      setData(payload);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Reports Center</h1>
          <p className="text-gray-600 mb-6">Generate date-range drink sales reports and review standard business reports.</p>

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-bold mb-3">Drink Sales Report Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">From</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full border rounded p-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">To</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full border rounded p-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600 block mb-1">Product Name (optional)</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Mango, Classic Milk Tea"
                  className="w-full border rounded p-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-3">
              <button onClick={loadReports} disabled={loading} className="bg-primary text-white px-4 py-2 rounded hover:bg-secondary disabled:opacity-60">
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {error && <div className="mb-6 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}

          {loading || !data ? (
            <div className="text-gray-500">Loading reports...</div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-3">Standard Reports</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <NumberStat label="Total Drinks Sold" value={data.standardReports.totalDrinksSold} />
                  <NumberStat label="Total Revenue" value={`$${data.standardReports.totalRevenue.toFixed(2)}`} />
                  <NumberStat label="Online Orders" value={data.standardReports.onlineOrders} />
                  <NumberStat label="Walk-in Tickets" value={data.standardReports.walkInTickets} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-bold mb-3">Sales Snapshot</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Date Range:</span> <strong>{data.filters.from}</strong> to <strong>{data.filters.to}</strong></p>
                    <p><span className="text-gray-500">Online Revenue:</span> <strong>${data.standardReports.onlineRevenue.toFixed(2)}</strong></p>
                    <p><span className="text-gray-500">Walk-in Revenue:</span> <strong>${data.standardReports.walkInRevenue.toFixed(2)}</strong></p>
                    <p><span className="text-gray-500">Unique Customers:</span> <strong>{data.standardReports.uniqueCustomers}</strong></p>
                    <p><span className="text-gray-500">Avg Drinks per Ticket:</span> <strong>{data.standardReports.averageDrinksPerTicket.toFixed(2)}</strong></p>
                    <p><span className="text-gray-500">Order Type Split:</span> <strong>Pickup {data.standardReports.orderTypeSplit.pickup}</strong> · <strong>Delivery {data.standardReports.orderTypeSplit.delivery}</strong></p>
                    <p><span className="text-gray-500">Visitors:</span> <strong>{data.standardReports.visitorsCount}</strong></p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-bold mb-3">Top Drink</h3>
                  {data.standardReports.topDrink ? (
                    <div className="text-sm">
                      <p className="text-xl font-bold text-primary">{data.standardReports.topDrink.name}</p>
                      <p className="text-gray-600 mt-1">Units sold: <strong>{data.standardReports.topDrink.quantity}</strong></p>
                      <p className="text-gray-600">Revenue: <strong>${data.standardReports.topDrink.revenue.toFixed(2)}</strong></p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No drinks sold in this range.</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-bold">Drink Sales Report {data.filters.product ? `(Filtered by: ${data.filters.product})` : ''}</h3>
                  <p className="text-sm text-gray-500 mt-1">{data.drinksReport.totalDrinksSold} drinks across {data.drinksReport.matchedProducts} products</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Product</th>
                      <th className="text-right p-3">Drinks Sold</th>
                      <th className="text-right p-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.drinksReport.rows.map((row) => (
                      <tr key={row.name} className="border-t hover:bg-gray-50">
                        <td className="p-3">{row.name}</td>
                        <td className="p-3 text-right font-semibold">{row.quantity}</td>
                        <td className="p-3 text-right text-green-600 font-semibold">${row.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                    {data.drinksReport.rows.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-gray-400">No matching drinks sold for the selected filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 border-b"><h3 className="text-lg font-bold">Top Products (Standard)</h3></div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3">Product</th>
                        <th className="text-right p-3">Qty</th>
                        <th className="text-right p-3">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.standardReports.topProducts.map((row) => (
                        <tr key={row.name} className="border-t">
                          <td className="p-3">{row.name}</td>
                          <td className="p-3 text-right">{row.quantity}</td>
                          <td className="p-3 text-right">${row.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                      {data.standardReports.topProducts.length === 0 && (
                        <tr><td colSpan={3} className="p-6 text-center text-gray-400">No data yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 border-b"><h3 className="text-lg font-bold">Top Visitor Cities</h3></div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3">City</th>
                        <th className="text-right p-3">Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.standardReports.topVisitorCities.map((row) => (
                        <tr key={row.city} className="border-t">
                          <td className="p-3">{row.city}</td>
                          <td className="p-3 text-right">{row.visits}</td>
                        </tr>
                      ))}
                      {data.standardReports.topVisitorCities.length === 0 && (
                        <tr><td colSpan={2} className="p-6 text-center text-gray-400">No visitor data yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}