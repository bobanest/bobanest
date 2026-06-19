'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect, useRef } from 'react';

function IngredientInput({ value, onChange, onSelect }) {
  const [suggs, setSuggs] = useState([]);
  const timer = useRef(null);

  const handleChange = (v) => {
    onChange(v);
    clearTimeout(timer.current);
    if (v.length < 2) { setSuggs([]); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/supply-inventory?search=${encodeURIComponent(v)}`);
      const d = await res.json();
      setSuggs(d);
    }, 200);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setSuggs([]), 200)}
        className="w-full border p-2 rounded text-sm"
        placeholder="Ingredient name…"
      />
      {suggs.length > 0 && (
        <div className="absolute z-50 bg-white border rounded shadow-lg top-full left-0 right-0 max-h-40 overflow-y-auto">
          {suggs.map(s => (
            <div
              key={s._id}
              onMouseDown={() => { onSelect(s); setSuggs([]); }}
              className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer flex justify-between"
            >
              <span>{s.name}</span>
              <span className="text-gray-400 text-xs">{s.stockCount} {s.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SIZES = ['standard', 'large', 'any'];
const SIZE_LABELS = { standard: 'Standard (16oz)', large: 'Large (22oz)', any: 'Any size' };
const SIZE_COLORS = {
  standard: 'bg-blue-100 text-blue-700',
  large:    'bg-purple-100 text-purple-700',
  any:      'bg-green-100 text-green-700',
};
const emptyIngredient = { name: '', quantity: '', unit: 'ml', inventoryItemId: '', _purchaseUnit: '', _mlPerUnit: null };

// Build lookup key for the recipe map
const rKey = (productName, size) => `${productName.toLowerCase()}|${size}`;

export default function AdminRecipes() {
  const [products, setProducts] = useState([]);
  const [recipes, setRecipes] = useState({});           // key: `name|size`
  const [editingProduct, setEditingProduct] = useState(null);
  const [editSize, setEditSize] = useState('standard');
  const [editIngredients, setEditIngredients] = useState([]);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/products').then(r => r.json()).then(d => setProducts(d));
    fetchRecipes();
  }, []);

  const fetchRecipes = () => {
    fetch('/api/admin/recipes').then(r => r.json()).then(d => {
      const map = {};
      d.forEach(r => { map[rKey(r.productName, r.size || 'any')] = r; });
      setRecipes(map);
    });
  };

  const handleLoadTemplates = async () => {
    if (!confirm('Load recipe templates (Standard + Large variants) from your price breakdown?\n\nAll existing templates will be overwritten.')) return;
    const res = await fetch('/api/admin/seed-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ what: 'recipes', overwrite: true }),
    });
    const data = await res.json();
    if (res.ok) {
      fetchRecipes();
      setMsg(`✓ Loaded ${data.recipes?.created ?? 0} recipes`);
      setTimeout(() => setMsg(''), 5000);
    }
  };

  const startEdit = (product, size = 'standard') => {
    const existing = recipes[rKey(product.name, size)];
    setEditingProduct(product);
    setEditSize(size);
    setEditIngredients(
      existing
        ? existing.ingredients.map(i => ({ ...i, quantity: i.quantity.toString() }))
        : [{ ...emptyIngredient }]
    );
    setEditNotes(existing?.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When size tab changes while form is open, load that size's recipe
  const switchSize = (size) => {
    const existing = recipes[rKey(editingProduct.name, size)];
    setEditSize(size);
    setEditIngredients(
      existing
        ? existing.ingredients.map(i => ({ ...i, quantity: i.quantity.toString() }))
        : [{ ...emptyIngredient }]
    );
    setEditNotes(existing?.notes || '');
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditIngredients([]);
    setEditNotes('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const valid = editIngredients.filter(i => i.name && i.quantity);
    if (!valid.length) {
      setMsg('Add at least one ingredient with a name and quantity.');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setSaving(true);
    // Always POST (server-side upserts by productName+size — no _id needed)
    const body = {
      productName: editingProduct.name,
      size: editSize,
      ingredients: valid.map(({ name, quantity, unit }) => ({ name, quantity, unit })),
      notes: editNotes,
    };

    const res = await fetch('/api/admin/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setMsg('✓ Recipe saved');
      fetchRecipes();
      cancelEdit();
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg(`Error saving recipe: ${data.error || res.status}`);
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleDelete = async (productName, size) => {
    const recipe = recipes[rKey(productName, size)];
    if (!recipe || !confirm(`Delete ${SIZE_LABELS[size]} recipe for "${productName}"?`)) return;
    await fetch('/api/admin/recipes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: recipe._id }),
    });
    fetchRecipes();
    if (editingProduct?.name === productName && editSize === size) cancelEdit();
    setMsg('✓ Recipe deleted');
    setTimeout(() => setMsg(''), 3000);
  };

  const addIngredient = () => setEditIngredients(p => [...p, { ...emptyIngredient }]);
  const removeIngredient = (i) => setEditIngredients(p => p.filter((_, idx) => idx !== i));
  const updateIngredient = (i, field, value) =>
    setEditIngredients(p => p.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );
  // count products that have at least one recipe
  const withRecipe = products.filter(p =>
    SIZES.some(s => recipes[rKey(p.name, s)])
  ).length;

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Recipes</h1>
          <p className="text-gray-500 mb-5 text-sm">
            {withRecipe}/{products.length} products have recipes ·
            Inventory auto-deducts when online orders complete or walk-in sales are logged.
            Size modifier (Standard/Large) and boba modifier are handled automatically.
          </p>

          {msg && <p className={`text-sm mb-4 ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}

          {/* Load templates banner */}
          {withRecipe === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-blue-800">Recipe templates ready — Standard (16oz) + Large (22oz) variants</p>
                <p className="text-sm text-blue-600 mt-0.5">Latte (7), All-in-One (9), Green Tea (5) — quantities from your cost spreadsheet.</p>
              </div>
              <button onClick={handleLoadTemplates} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Load All Recipe Templates
              </button>
            </div>
          )}

          {/* Edit form */}
          {editingProduct && (
            <form onSubmit={handleSave} className="bg-white rounded-xl shadow border border-gray-100 p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">Recipe: {editingProduct.name}</h3>
                <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 text-sm">✕ Cancel</button>
              </div>

              {/* Size tabs */}
              <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
                {SIZES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => switchSize(s)}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                      editSize === s ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {SIZE_LABELS[s]}
                    {recipes[rKey(editingProduct.name, s)] && (
                      <span className="ml-1.5 text-green-500">●</span>
                    )}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-400 mb-4">
                Set quantities consumed per <strong>1 serving</strong> for the selected size.
                If an ingredient is tracked in bottles but used in ml, set the <strong>Usage Unit</strong> and <strong>Per Purchase Unit</strong> on that inventory item — the system will convert automatically.
                {editSize === 'standard' && ' Standard = 16oz.'}
                {editSize === 'large' && ' Large = 22oz.'}
              </p>

              {/* Copy from existing recipe */}
              {Object.keys(recipes).length > 0 && (
                <div className="mb-4 bg-gray-50 rounded-lg p-3">
                  <label className="block text-xs font-semibold mb-1">↔ Copy ingredients from existing recipe</label>
                  <select
                    className="w-full border p-2 rounded text-sm bg-white"
                    value=""
                    onChange={e => {
                      if (!e.target.value) return;
                      const src = recipes[e.target.value];
                      if (src) setEditIngredients(src.ingredients.map(i => ({ ...i, quantity: i.quantity.toString() })));
                    }}
                  >
                    <option value="">— select a recipe to copy its ingredients —</option>
                    {Object.values(recipes).map(r => (
                      <option key={r._id} value={rKey(r.productName, r.size || 'any')}>
                        {r.productName} — {SIZE_LABELS[r.size || 'any']} ({r.ingredients.length} ingredients)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Header row (desktop only) */}
              <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 px-1 mb-1">
                <div className="col-span-5">Ingredient</div>
                <div className="col-span-3">Qty per serving</div>
                <div className="col-span-3">Unit</div>
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-2 mb-3">
                {editIngredients.map((ing, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-12 md:col-span-5">
                      <IngredientInput
                        value={ing.name}
                        onChange={v => updateIngredient(i, 'name', v)}
                        onSelect={s => {
                          updateIngredient(i, 'name', s.name);
                          updateIngredient(i, 'unit', s.usageUnit || s.unit);
                          updateIngredient(i, 'inventoryItemId', s._id);
                          updateIngredient(i, '_purchaseUnit', s.unit);
                          updateIngredient(i, '_mlPerUnit', s.mlPerUnit || null);
                        }}
                      />
                    </div>
                    <div className="col-span-5 md:col-span-3">
                      <input
                        type="number" min="0" step="0.001"
                        value={ing.quantity}
                        onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                        className="w-full border p-2 rounded text-sm"
                        placeholder="0"
                      />
                      {ing._mlPerUnit > 0 && ing.quantity && (
                        <p className="text-xs text-blue-500 mt-0.5">
                          ≈ {(parseFloat(ing.quantity) / ing._mlPerUnit).toFixed(4)} {ing._purchaseUnit}
                        </p>
                      )}
                    </div>
                    <div className="col-span-5 md:col-span-3">
                      <input
                        type="text"
                        value={ing.unit}
                        onChange={e => updateIngredient(i, 'unit', e.target.value)}
                        className="w-full border p-2 rounded text-sm"
                        placeholder="ml / g / pcs"
                      />
                      {ing._mlPerUnit > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">1 {ing._purchaseUnit} = {ing._mlPerUnit} {ing.unit}</p>
                      )}
                    </div>
                    <div className="col-span-2 md:col-span-1 text-center">
                      {editIngredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(i)}
                          className="text-red-400 hover:text-red-600 w-8 h-8 text-lg"
                        >✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addIngredient} className="text-sm text-primary underline mb-4">
                + Add Ingredient
              </button>

              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1">Notes (optional)</label>
                <input
                  type="text" value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full border p-2 rounded text-sm"
                  placeholder="e.g. uses 22oz cup, extra boba variation…"
                />
              </div>

              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving…' : `Save ${SIZE_LABELS[editSize]} Recipe`}
              </button>
            </form>
          )}

          {/* Search + Load Templates button */}
          <div className="mb-4 flex gap-3 items-center flex-wrap">
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
            />
            <button onClick={handleLoadTemplates} className="text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 font-medium whitespace-nowrap">
              Load Recipe Templates
            </button>
          </div>

          {/* Product list */}
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Product</th>
                  <th className="text-center p-3">Sizes with Recipe</th>
                  <th className="p-3 w-48"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(product => {
                  const productRecipes = SIZES.map(s => ({ size: s, recipe: recipes[rKey(product.name, s)] })).filter(x => x.recipe);
                  return (
                    <tr key={product._id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <p className="font-medium">{product.name}</p>
                        {product.category && <p className="text-xs text-gray-400 capitalize">{product.category}</p>}
                      </td>
                      <td className="p-3 text-center">
                        {productRecipes.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {productRecipes.map(({ size, recipe }) => (
                              <span key={size} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${SIZE_COLORS[size]}`}>
                                {size === 'standard' ? '16oz' : size === 'large' ? '22oz' : 'Any'} · {recipe.ingredients.length}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">No recipe</span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {SIZES.filter(s => s !== 'any').map(s => {
                          const exists = !!recipes[rKey(product.name, s)];
                          return (
                            <span key={s} className="inline-flex gap-1 mr-2">
                              <button
                                onClick={() => startEdit(product, s)}
                                className={`text-xs font-medium ${exists ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                {exists ? `Edit ${s === 'standard' ? '16oz' : '22oz'}` : `+ ${s === 'standard' ? '16oz' : '22oz'}`}
                              </button>
                              {exists && (
                                <button
                                  onClick={() => handleDelete(product.name, s)}
                                  className="text-xs text-red-300 hover:text-red-500"
                                >✕</button>
                              )}
                            </span>
                          );
                        })}
                        <button
                          onClick={() => startEdit(product, 'any')}
                          className={`text-xs ${recipes[rKey(product.name, 'any')] ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-gray-600'} font-medium`}
                        >
                          {recipes[rKey(product.name, 'any')] ? 'Edit Any' : '+ Any'}
                        </button>
                        {recipes[rKey(product.name, 'any')] && (
                          <button onClick={() => handleDelete(product.name, 'any')} className="text-xs text-red-300 hover:text-red-500 ml-1">✕</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-400">No products found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
