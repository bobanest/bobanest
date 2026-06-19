'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';

const fmt = (n) => n == null ? '—' : `$${Number(n).toFixed(2)}`;
const pct = (n) => n == null ? '—' : `${Number(n).toFixed(1)}%`;

function marginColor(pct) {
  if (pct == null) return 'text-gray-400';
  if (pct >= 70) return 'text-green-600';
  if (pct >= 50) return 'text-yellow-600';
  return 'text-red-500';
}

function marginBg(pct) {
  if (pct == null) return 'bg-gray-100 text-gray-400';
  if (pct >= 70) return 'bg-green-100 text-green-700';
  if (pct >= 50) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-600';
}

export default function CostAnalysis() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [sizeTab, setSizeTab] = useState('standard');

  useEffect(() => {
    fetch('/api/admin/cost-analysis')
      .then(r => r.json())
      .then(d => { setRows(d); setLoading(false); });
  }, []);

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const filtered = rows.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats for current size tab
  const withData = filtered.flatMap(r =>
    r.sizes.filter(s => s.size === sizeTab && s.hasRecipe && s.marginPct != null)
  );
  const avgMargin = withData.length
    ? withData.reduce((sum, s) => sum + s.marginPct, 0) / withData.length
    : null;
  const avgCost = withData.length
    ? withData.reduce((sum, s) => sum + s.ingredientCost, 0) / withData.length
    : null;
  const lowestMargin = withData.length
    ? withData.reduce((min, s) => s.marginPct < min.marginPct ? s : min, withData[0])
    : null;

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Cost Analysis</h1>
          <p className="text-gray-500 text-sm mb-6">
            Ingredient cost per serving vs. sale price. Margin = (sale − cost) ÷ sale.
            Missing costs mean that inventory item has no $/unit set.
          </p>

          {/* Summary cards */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-xs text-gray-500 mb-1">Products with recipes</p>
                <p className="text-2xl font-bold">{filtered.filter(r => r.sizes.some(s => s.hasRecipe)).length}</p>
                <p className="text-xs text-gray-400">of {filtered.length} total</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-xs text-gray-500 mb-1">Avg ingredient cost</p>
                <p className="text-2xl font-bold">{avgCost != null ? fmt(avgCost) : '—'}</p>
                <p className="text-xs text-gray-400 capitalize">{sizeTab} size</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-xs text-gray-500 mb-1">Avg margin</p>
                <p className={`text-2xl font-bold ${marginColor(avgMargin)}`}>{pct(avgMargin)}</p>
                <p className="text-xs text-gray-400 capitalize">{sizeTab} size</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <p className="text-xs text-gray-500 mb-1">Lowest margin</p>
                <p className={`text-2xl font-bold ${marginColor(lowestMargin?.marginPct)}`}>
                  {lowestMargin ? pct(lowestMargin.marginPct) : '—'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {lowestMargin
                    ? filtered.find(r => r.sizes.includes(lowestMargin))?.name ?? ''
                    : 'No data'}
                </p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
            />
            {/* Size tab toggle */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              {['standard', 'large'].map(s => (
                <button
                  key={s}
                  onClick={() => setSizeTab(s)}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                    sizeTab === s ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s === 'standard' ? '16oz Standard' : '22oz Large'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-center py-12 text-gray-400">Loading…</p>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="text-left p-3 pl-4">Product</th>
                    <th className="text-right p-3">Sale Price</th>
                    <th className="text-right p-3">Ingr. Cost</th>
                    <th className="text-right p-3">Gross Profit</th>
                    <th className="text-center p-3">Margin %</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => {
                    const sizeData = row.sizes.find(s => s.size === sizeTab);
                    const isOpen = expanded[row._id];

                    return (
                      <>
                        <tr
                          key={row._id}
                          className={`border-t hover:bg-gray-50 ${sizeData?.hasRecipe ? 'cursor-pointer' : ''}`}
                          onClick={() => sizeData?.hasRecipe && toggle(row._id)}
                        >
                          <td className="p-3 pl-4">
                            <p className="font-medium">{row.name}</p>
                            {row.category && <p className="text-xs text-gray-400 capitalize">{row.category}</p>}
                          </td>
                          <td className="p-3 text-right font-mono">{fmt(row.salePrice)}</td>
                          <td className="p-3 text-right font-mono">
                            {sizeData?.hasRecipe
                              ? sizeData.missingCost
                                ? <span className="text-orange-500 text-xs">incomplete</span>
                                : fmt(sizeData.ingredientCost)
                              : <span className="text-gray-300">no recipe</span>}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {sizeData?.hasRecipe && !sizeData.missingCost ? fmt(sizeData.margin) : '—'}
                          </td>
                          <td className="p-3 text-center">
                            {sizeData?.hasRecipe && sizeData.marginPct != null ? (
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${marginBg(sizeData.marginPct)}`}>
                                {pct(sizeData.marginPct)}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center text-gray-400 text-xs">
                            {sizeData?.hasRecipe ? (isOpen ? '▲' : '▼') : ''}
                          </td>
                        </tr>

                        {/* Expanded ingredient breakdown */}
                        {isOpen && sizeData?.ingredients?.length > 0 && (
                          <tr key={`${row._id}-detail`} className="bg-gray-50 border-t">
                            <td colSpan={6} className="px-6 py-3">
                              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                                Ingredient Breakdown — {sizeTab === 'standard' ? '16oz Standard' : '22oz Large'}
                              </p>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-400">
                                    <th className="text-left pb-1">Ingredient</th>
                                    <th className="text-right pb-1">Qty</th>
                                    <th className="text-right pb-1">Unit</th>
                                    <th className="text-right pb-1">$/Unit</th>
                                    <th className="text-right pb-1">Line Cost</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sizeData.ingredients.map((ing, i) => (
                                    <tr key={i} className="border-t border-gray-100">
                                      <td className="py-1">{ing.name}</td>
                                      <td className="text-right py-1">{ing.quantity}</td>
                                      <td className="text-right py-1 text-gray-400">{ing.unit}</td>
                                      <td className="text-right py-1 font-mono">
                                        {ing.costPerUnit != null
                                          ? `$${ing.costPerUnit.toFixed(4)}`
                                          : <span className="text-orange-400">not set</span>}
                                      </td>
                                      <td className="text-right py-1 font-mono font-semibold">
                                        {ing.lineCost != null ? fmt(ing.lineCost) : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="border-t border-gray-300 font-semibold">
                                    <td colSpan={4} className="pt-2 text-right text-gray-600">Total ingredient cost</td>
                                    <td className="pt-2 text-right font-mono">{fmt(sizeData.ingredientCost)}</td>
                                  </tr>
                                  <tr>
                                    <td colSpan={4} className="text-right text-gray-600">Sale price</td>
                                    <td className="text-right font-mono">{fmt(row.salePrice)}</td>
                                  </tr>
                                  <tr>
                                    <td colSpan={4} className="text-right font-bold">Gross profit</td>
                                    <td className={`text-right font-mono font-bold ${marginColor(sizeData.marginPct)}`}>
                                      {fmt(sizeData.margin)} ({pct(sizeData.marginPct)})
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-400">No products found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4">
            * Margin % = (Sale Price − Ingredient Cost) ÷ Sale Price × 100.
            Boba add-ons not included (they are priced separately).
            Set $/unit on inventory items to fill in missing costs.
          </p>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
