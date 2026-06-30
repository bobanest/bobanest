'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

const CATEGORIES = ['all', 'ingredients', 'packaging', 'supplies', 'other'];

const CAT_COLORS = {
  ingredients: 'bg-green-100 text-green-700',
  packaging: 'bg-blue-100 text-blue-700',
  supplies: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
};

const emptyForm = { name: '', unit: 'unit', stockCount: '0', lowStockThreshold: '5', category: 'other', notes: '', costPerUnit: '', servingsPerUnit: '', usageUnit: '', mlPerUnit: '' };

function ItemForm({ form, setForm, onSubmit, onCancel, title, submitLabel, saving }) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl shadow border border-gray-100 p-5 mb-6">
      <h3 className="font-bold mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="md:col-span-2 col-span-1">
          <label className="block text-xs font-semibold mb-1">Item Name *</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="e.g. Taro Powder" required />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Unit</label>
          <input type="text" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="bag, bottle, box, roll…" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Stock Count</label>
          <input type="number" min="0" step="0.01" value={form.stockCount} onChange={e => setForm(f => ({ ...f, stockCount: e.target.value }))} className="w-full border p-2 rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Low Stock Alert At</label>
          <input type="number" min="0" value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} className="w-full border p-2 rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border p-2 rounded text-sm">
            <option value="ingredients">Ingredients</option>
            <option value="packaging">Packaging</option>
            <option value="supplies">Supplies</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="md:col-span-2 col-span-1">
          <label className="block text-xs font-semibold mb-1">Notes</label>
          <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="Optional notes…" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Cost per Unit ($) <span className="text-gray-400 font-normal">optional</span></label>
          <input type="number" min="0" step="0.000001" value={form.costPerUnit ?? ''} onChange={e => setForm(f => ({ ...f, costPerUnit: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="0.000000" />
        </div>
        <div className="md:col-span-3 col-span-1">
          <p className="text-xs font-semibold text-gray-500 mb-2 mt-1 border-t pt-3">Recipe / Usage Unit <span className="text-gray-400 font-normal">(optional — for ml/g-based recipes)</span></p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Usage Unit <span className="text-gray-400 font-normal">e.g. ml, g</span></label>
              <input type="text" value={form.usageUnit ?? ''} onChange={e => setForm(f => ({ ...f, usageUnit: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="ml" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Per Purchase Unit <span className="text-gray-400 font-normal">e.g. 2500</span></label>
              <input type="number" min="0" step="0.01" value={form.mlPerUnit ?? ''} onChange={e => setForm(f => ({ ...f, mlPerUnit: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="e.g. 2500 ml per bottle" />
            </div>
          </div>
          {form.usageUnit && form.mlPerUnit && (
            <p className="text-xs text-blue-500 mt-1">1 {form.unit || 'unit'} = {form.mlPerUnit} {form.usageUnit}</p>
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving…' : submitLabel}</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'usage'

  // Usage log state
  const [usageFrom, setUsageFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [usageTo, setUsageTo] = useState(new Date().toISOString().slice(0, 10));
  const [usageSource, setUsageSource] = useState('all');
  const [usageData, setUsageData] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const fetchUsage = async () => {
    setUsageLoading(true);
    const params = new URLSearchParams({ from: usageFrom, to: usageTo, source: usageSource });
    const res = await fetch(`/api/admin/inventory-log?${params}`);
    setUsageData(await res.json());
    setUsageLoading(false);
  };

  useEffect(() => { if (activeTab === 'usage') fetchUsage(); }, [activeTab]);

  const fetchItems = () => {
    setLoading(true);
    fetch('/api/admin/supply-inventory').then(r => r.json()).then(d => { setItems(d); setLoading(false); });
  };
  useEffect(() => { fetchItems(); }, []);

  const handleLoadTemplate = async () => {
    if (!confirm('Load 14 standard boba ingredients from your price breakdown?\n\nExisting items with the same name will NOT be overwritten.')) return;
    const res = await fetch('/api/admin/seed-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ what: 'inventory', overwrite: true }),
    });
    const data = await res.json();
    if (res.ok) {
      fetchItems();
      setMsg(`✓ Added ${data.inventory.created} ingredients (${data.inventory.skipped} already existed)`);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.notes || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || item.category === catFilter;
    return matchSearch && matchCat;
  });

  const lowStock = items.filter(i => i.stockCount <= i.lowStockThreshold);

  const adjust = async (id, delta) => {
    const res = await fetch('/api/admin/supply-inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, adjust: delta }),
    });
    const updated = await res.json();
    setItems(its => its.map(i => i._id === updated._id ? updated : i));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/supply-inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      setAddForm({ ...emptyForm });
      setShowAdd(false);
      fetchItems();
      setMsg('✓ Item added');
      setTimeout(() => setMsg(''), 3000);
    }
    setSaving(false);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/admin/supply-inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editItem._id, ...editItem }),
    });
    setSaving(false);
    setEditItem(null);
    fetchItems();
    setMsg('✓ Item updated');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch('/api/admin/supply-inventory', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setItems(its => its.filter(i => i._id !== id));
  };

  const startEdit = (item) => {
    setEditItem({ ...item, stockCount: item.stockCount?.toString() || '0', lowStockThreshold: item.lowStockThreshold?.toString() || '5', mlPerUnit: item.mlPerUnit?.toString() || '', usageUnit: item.usageUnit || '' });
    setShowAdd(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-3xl font-bold">Supply Inventory</h1>
            <div className="flex gap-2">
              <button onClick={handleLoadTemplate} className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 font-medium">Load Template</button>
              <button onClick={() => { setShowAdd(s => !s); setEditItem(null); }} className="btn-primary">
                {showAdd ? 'Cancel' : '+ Add Item'}
              </button>
            </div>
          </div>
          <p className="text-gray-500 mb-5">{items.length} items tracked · {lowStock.length} low / out of stock</p>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b">
            {[['inventory', 'Inventory'], ['usage', 'Usage by Date']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setActiveTab(val)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === val ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >{label}</button>
            ))}
          </div>

          {msg && <p className={`text-sm mb-4 ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}

          {activeTab === 'usage' && (
            <div>
              <div className="flex flex-wrap gap-3 mb-4 items-end">
                <div>
                  <label className="block text-xs font-semibold mb-1">From</label>
                  <input type="date" value={usageFrom} onChange={e => setUsageFrom(e.target.value)} className="border p-2 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">To</label>
                  <input type="date" value={usageTo} onChange={e => setUsageTo(e.target.value)} className="border p-2 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Source</label>
                  <select value={usageSource} onChange={e => setUsageSource(e.target.value)} className="border p-2 rounded text-sm">
                    <option value="all">All</option>
                    <option value="online_order">Online Orders</option>
                    <option value="walkin">Walk-in</option>
                  </select>
                </div>
                <button onClick={fetchUsage} className="btn-primary">Apply</button>
              </div>

              {usageLoading ? <p className="text-gray-400">Loading...</p> : usageData && (
                <>
                  {usageData.ingredientSummary?.length === 0 ? (
                    <p className="text-gray-400 text-sm py-8 text-center">No inventory deductions found in this date range.</p>
                  ) : (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left p-3">Ingredient</th>
                            <th className="text-right p-3">Total Used</th>
                            <th className="text-left p-3">Daily Breakdown</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usageData.ingredientSummary?.map(ing => (
                            <tr key={ing.name} className="border-t">
                              <td className="p-3 font-medium">{ing.name}</td>
                              <td className="p-3 text-right font-semibold">{ing.total.toFixed(2)}</td>
                              <td className="p-3 text-xs text-gray-500">
                                {Object.entries(ing.byDate).sort((a, b) => a[0].localeCompare(b[0])).map(([d, amt]) => (
                                  <span key={d} className="mr-3 whitespace-nowrap">{d}: <strong>{amt.toFixed(2)}</strong></span>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <>


          {showAdd && (
            <ItemForm
              form={addForm} setForm={setAddForm}
              onSubmit={handleAdd} onCancel={() => setShowAdd(false)}
              title="Add New Item" submitLabel="Add Item" saving={saving}
            />
          )}

          {editItem && (
            <ItemForm
              form={editItem} setForm={setEditItem}
              onSubmit={handleEdit} onCancel={() => setEditItem(null)}
              title={`Edit: ${editItem.name}`} submitLabel="Save Changes" saving={saving}
            />
          )}

          {lowStock.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-5">
              <p className="font-bold text-orange-700 mb-2">⚠️ Low / Out of Stock ({lowStock.length})</p>
              <div className="flex flex-wrap gap-2">
                {lowStock.map(i => (
                  <span key={i._id} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                    {i.name} — {i.stockCount} {i.unit} left
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <input
              type="text"
              placeholder="Search items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
            />
            <div className="flex gap-1 flex-wrap">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize border transition-colors ${catFilter === c ? 'bg-dark text-white border-dark' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? <p className="text-gray-400">Loading…</p> : (
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Item</th>
                    <th className="text-center p-3 w-28">Category</th>
                    <th className="text-center p-3 w-20">Unit</th>
                    <th className="text-center p-3 w-24">$/Unit</th>
                    <th className="text-center p-3 w-36">Stock Available</th>
                    <th className="text-center p-3 w-44">Stock</th>
                    <th className="text-center p-3 w-24">Alert At</th>
                    <th className="text-center p-3 w-28">Updated</th>
                    <th className="p-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const isLow = item.stockCount <= item.lowStockThreshold;
                    return (
                      <tr key={item._id} className={`border-t ${item.stockCount <= 0 ? 'bg-red-50' : isLow ? 'bg-orange-50' : ''}`}>
                        <td className="p-3">
                          <p className="font-medium">{item.name}</p>
                          {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${CAT_COLORS[item.category] || CAT_COLORS.other}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 text-center text-gray-500 text-xs">{item.unit}</td>
                        <td className="p-3 text-center text-gray-500 text-xs">
                          {item.costPerUnit != null ? `$${parseFloat(item.costPerUnit).toFixed(4)}` : '—'}
                        </td>
                        <td className="p-3 text-center text-xs">
                          {item.mlPerUnit > 0 ? (
                            <span className={`font-semibold block ${
                              item.stockCount <= 0 ? 'text-red-500' : 'text-green-600'
                            }`}>
                              {(item.stockCount * item.mlPerUnit).toLocaleString()} {item.usageUnit}
                            </span>
                          ) : item.servingsPerUnit ? (
                            <span className={`font-semibold ${
                              item.stockCount <= 0 ? 'text-red-500' :
                              (item.stockCount * item.servingsPerUnit) < 20 ? 'text-orange-500' : 'text-green-600'
                            }`}>
                              ~{Math.floor(item.stockCount * item.servingsPerUnit)} servings
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                          {item.mlPerUnit > 0 && (
                            <span className="text-gray-400 text-xs block">{item.stockCount} {item.unit}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => adjust(item._id, -1)} className="w-9 h-9 rounded bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 text-base leading-none">−</button>
                            <span className={`font-bold w-10 text-center text-base ${item.stockCount <= 0 ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-800'}`}>
                              {item.stockCount}
                            </span>
                            <button onClick={() => adjust(item._id, 1)} className="w-9 h-9 rounded bg-gray-100 hover:bg-gray-200 font-bold text-gray-600 text-base leading-none">+</button>
                          </div>
                        </td>
                        <td className="p-3 text-center text-gray-400 text-xs">{item.lowStockThreshold}</td>
                        <td className="p-3 text-center text-xs text-gray-400">{new Date(item.updatedAt).toLocaleDateString()}</td>
                        <td className="p-3">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => startEdit(item)} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Edit</button>
                            <button onClick={() => handleDelete(item._id, item.name)} className="text-xs text-red-400 hover:text-red-600">Del</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="p-12 text-center text-gray-400">
                      {items.length === 0 ? 'No inventory items yet. Create a PO or add items manually.' : 'No items match your search.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
            </>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
