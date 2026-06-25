'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/inventory');
      if (!res.ok) throw new Error('Failed to load inventory');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item?.name || ''} ${item?.category || ''}`.toLowerCase().includes(q)
    );
  }, [items, search]);

  const updateItem = async (itemId, patch) => {
    setSavingId(itemId);
    setError('');
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, ...patch }),
      });
      if (!res.ok) throw new Error('Failed to update item');
      const updated = await res.json();
      setItems((prev) => prev.map((item) => (item._id === itemId ? updated : item)));
    } catch (e) {
      setError(e.message || 'Failed to update item');
    } finally {
      setSavingId('');
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Inventory</h1>
              <p className="text-gray-500 text-sm mt-1">
                Manage stock flags and low-stock thresholds for products.
              </p>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or category"
              className="border rounded-lg px-3 py-2 text-sm w-full sm:w-72"
            />
          </div>

          {error && <p className="text-red-500 mb-4">{error}</p>}

          {loading ? (
            <div className="bg-white rounded-xl shadow p-6 text-gray-500">Loading inventory...</div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-gray-500">No products found.</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">Product</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">In Stock</th>
                    <th className="text-left p-3">Stock Count</th>
                    <th className="text-left p-3">Low Stock Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isSaving = savingId === item._id;
                    return (
                      <tr key={item._id} className="border-t align-top">
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3 text-gray-600">{item.category || '—'}</td>
                        <td className="p-3">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(item.inStock)}
                              disabled={isSaving}
                              onChange={(e) => updateItem(item._id, { inStock: e.target.checked })}
                            />
                            <span>{item.inStock ? 'Yes' : 'No'}</span>
                          </label>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            value={item.stockCount ?? 0}
                            disabled={isSaving}
                            className="w-28 border rounded px-2 py-1"
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((p) =>
                                  p._id === item._id ? { ...p, stockCount: Number(e.target.value) } : p
                                )
                              )
                            }
                            onBlur={(e) =>
                              updateItem(item._id, { stockCount: Number(e.target.value || 0) })
                            }
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            value={item.lowStockThreshold ?? 0}
                            disabled={isSaving}
                            className="w-36 border rounded px-2 py-1"
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((p) =>
                                  p._id === item._id
                                    ? { ...p, lowStockThreshold: Number(e.target.value) }
                                    : p
                                )
                              )
                            }
                            onBlur={(e) =>
                              updateItem(item._id, { lowStockThreshold: Number(e.target.value || 0) })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
