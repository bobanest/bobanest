'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect, useRef } from 'react';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

const emptyItem = { name: '', quantity: 1, unit: 'unit', unitCost: '', conversionFactor: 1, inventoryUnit: '' };

function ItemNameInput({ value, onChange, onSelect }) {
  const [suggs, setSuggs] = useState([]);
  const timer = useRef(null);

  const handleChange = (e) => {
    onChange(e.target.value);
    clearTimeout(timer.current);
    if (e.target.value.length >= 2) {
      timer.current = setTimeout(async () => {
        const res = await fetch(`/api/admin/supply-inventory?search=${encodeURIComponent(e.target.value)}`);
        setSuggs(await res.json());
      }, 200);
    } else {
      setSuggs([]);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setSuggs([]), 150)}
        className="w-full border p-1 rounded text-sm"
        placeholder="Taro powder"
        required
      />
      {suggs.length > 0 && (
        <div className="absolute top-full left-0 z-50 bg-white border rounded-lg shadow-lg min-w-52 mt-0.5 py-1">
          {suggs.slice(0, 7).map(s => (
            <button
              key={s._id}
              type="button"
              onMouseDown={() => { onSelect(s); setSuggs([]); }}
              className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
            >
              <span className="font-medium">{s.name}</span>
              <span className="text-gray-400 ml-2">{s.stockCount} {s.unit} in stock</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendor, setVendor] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [taxRate, setTaxRate] = useState('7');
  const [submittedAt, setSubmittedAt] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState(null);

  // Edit state
  const [editPO, setEditPO] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editSaving, setEditSaving] = useState(false);

  const fetchPOs = async () => {
    const res = await fetch('/api/admin/purchase-orders');
    setPos(await res.json());
    setLoading(false);
  };
  useEffect(() => { fetchPOs(); }, []);

  const addItem = () => setItems(it => [...it, { ...emptyItem }]);
  const removeItem = (i) => setItems(it => it.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => setItems(it => it.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const lineTotal = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0);
  const itemsTotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const shipping = parseFloat(shippingCost) || 0;
  const taxPct = parseFloat(taxRate) || 0;
  const taxAmount = itemsTotal * (taxPct / 100);
  const grandTotal = itemsTotal + shipping + taxAmount;

  // Edit helpers
  const startEdit = (po, e) => {
    e.stopPropagation();
    setEditPO({
      _id: po._id,
      vendor: po.vendor || '',
      vendorEmail: po.vendorEmail || '',
      notes: po.notes || '',
      shippingCost: po.shippingCost?.toString() || '',
      taxRate: po.taxRate?.toString() || '7',
      submittedAt: po.submittedAt ? new Date(po.submittedAt).toISOString().slice(0, 10) : '',
      receivedAt: po.receivedAt ? new Date(po.receivedAt).toISOString().slice(0, 10) : '',
    });
    setEditItems(po.items?.map(i => ({ ...i })) || [{ ...emptyItem }]);
  };
  const cancelEdit = () => { setEditPO(null); setEditItems([]); };
  const addEditItem = () => setEditItems(it => [...it, { ...emptyItem }]);
  const removeEditItem = (i) => setEditItems(it => it.filter((_, idx) => idx !== i));
  const updateEditItem = (i, field, value) => setEditItems(it => it.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  const editLineTotal = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0);
  const editItemsTotal = editItems.reduce((s, i) => s + editLineTotal(i), 0);
  const editShipping = parseFloat(editPO?.shippingCost) || 0;
  const editTaxPct = parseFloat(editPO?.taxRate) || 0;
  const editTaxAmount = editItemsTotal * (editTaxPct / 100);
  const editGrandTotal = editItemsTotal + editShipping + editTaxAmount;

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    await fetch('/api/admin/purchase-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editPO._id,
        vendor: editPO.vendor,
        vendorEmail: editPO.vendorEmail,
        notes: editPO.notes,
        shippingCost: editPO.shippingCost,
        taxRate: editPO.taxRate,
        submittedAt: editPO.submittedAt || null,
        receivedAt: editPO.receivedAt || null,
        items: editItems,
      }),
    });
    setEditSaving(false);
    cancelEdit();
    fetchPOs();
    setMsg('✓ PO updated');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor, vendorEmail, notes, shippingCost, taxRate, submittedAt, receivedAt, sendEmail, items }),
    });
    if (res.ok) {
      const d = await res.json();
      setMsg(d.emailError ? `✓ PO created but email failed: ${d.emailError}` : '✓ PO created' + (sendEmail ? ' & email sent' : ''));
      setShowForm(false);
      setVendor(''); setVendorEmail(''); setNotes(''); setShippingCost('');
      setTaxRate('7'); setSubmittedAt(''); setReceivedAt(''); setSendEmail(false); setItems([{ ...emptyItem }]);
      fetchPOs();
    } else {
      const d = await res.json();
      setMsg(`Error: ${d.error}`);
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const sendPOEmail = async (po) => {
    if (!po.vendorEmail) { setMsg('No vendor email set for this PO'); return; }
    const res = await fetch('/api/admin/purchase-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: po._id, sendEmail: true }),
    });
    const d = await res.json();
    if (res.ok) {
      setMsg(d.emailError ? `Email failed: ${d.emailError}` : '✓ Email sent to supplier');
    } else {
      setMsg(`Failed to send email: ${d?.error || 'unknown error'}`);
    }
    setTimeout(() => setMsg(''), 6000);
  };

  const saveDates = async (po, newSubmittedAt, newReceivedAt) => {
    await fetch('/api/admin/purchase-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: po._id, submittedAt: newSubmittedAt || null, receivedAt: newReceivedAt || null }),
    });
    fetchPOs();
  };

  const updateStatus = async (id, status) => {
    await fetch('/api/admin/purchase-orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchPOs();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this PO?')) return;
    await fetch('/api/admin/purchase-orders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setPos(p => p.filter(x => x._id !== id));
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Purchase Orders</h1>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              {showForm ? 'Cancel' : '+ New PO'}
            </button>
          </div>

          {msg && <p className={`text-sm mb-4 ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}

          {/* New PO form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="font-bold mb-4">New Purchase Order</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Vendor / Supplier *</label>
                  <input type="text" value={vendor} onChange={e => setVendor(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="e.g. Boba Supply Co." required />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Supplier Email <span className="text-gray-400 font-normal">(optional — to send PO)</span></label>
                  <input type="email" value={vendorEmail} onChange={e => setVendorEmail(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="supplier@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Date Submitted</label>
                  <input type="date" value={submittedAt} onChange={e => setSubmittedAt(e.target.value)} className="w-full border p-2 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Date Received</label>
                  <input type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} className="w-full border p-2 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Notes</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="Delivery instructions, etc." />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Shipping Cost ($)</label>
                  <input type="number" min="0" step="0.01" value={shippingCost} onChange={e => setShippingCost(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Tax Rate (%)</label>
                  <input type="number" min="0" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="7" />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold">Items *</label>
                  <button type="button" onClick={addItem} className="text-xs text-primary underline">+ Add Row</button>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded min-w-[520px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Item Name</th>
                      <th className="text-center p-2 w-20">Qty</th>
                      <th className="text-center p-2 w-24">PO Unit</th>
                      <th className="text-center p-2 w-28">Unit Cost ($)</th>
                      <th className="text-center p-2 w-16" title="How many inventory units is 1 PO unit? e.g. 1 case = 6 bags → enter 6">Conv.</th>
                      <th className="text-center p-2 w-24" title="Unit name in your inventory (e.g. bags)">Inv. Unit</th>
                      <th className="text-right p-2 w-24">Line Total</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-1">
                          <ItemNameInput
                            value={item.name}
                            onChange={v => updateItem(i, 'name', v)}
                            onSelect={s => { updateItem(i, 'name', s.name); updateItem(i, 'unit', s.unit); updateItem(i, 'inventoryUnit', s.unit); }}
                          />
                        </td>
                        <td className="p-1"><input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="w-full border p-1 rounded text-sm text-center" required /></td>
                        <td className="p-1"><input type="text" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} className="w-full border p-1 rounded text-sm text-center" placeholder="case" /></td>
                        <td className="p-1"><input type="number" min="0" step="0.01" value={item.unitCost} onChange={e => updateItem(i, 'unitCost', e.target.value)} className="w-full border p-1 rounded text-sm text-center" placeholder="0.00" required /></td>
                        <td className="p-1"><input type="number" min="1" step="1" value={item.conversionFactor ?? 1} onChange={e => updateItem(i, 'conversionFactor', e.target.value)} className="w-full border p-1 rounded text-sm text-center" title="Inventory units per PO unit (e.g. 6 bags per case)" /></td>
                        <td className="p-1"><input type="text" value={item.inventoryUnit ?? ''} onChange={e => updateItem(i, 'inventoryUnit', e.target.value)} className="w-full border p-1 rounded text-sm text-center" placeholder="bags" /></td>
                        <td className="p-2 text-right font-semibold">${lineTotal(item).toFixed(2)}</td>
                        <td className="p-1 text-center">{items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">✕</button>}</td>
                      </tr>
                    ))}
                    <tr className="border-t bg-gray-50">
                      <td colSpan={6} className="p-2 text-right text-gray-500">Items Subtotal</td>
                      <td className="p-2 text-right text-gray-700">${itemsTotal.toFixed(2)}</td>
                      <td></td>
                    </tr>
                    {shipping > 0 && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="p-2 text-right text-gray-500">Shipping</td>
                        <td className="p-2 text-right text-gray-700">${shipping.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    )}
                    {taxAmount > 0 && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="p-2 text-right text-gray-500">Tax ({taxPct}%)</td>
                        <td className="p-2 text-right text-gray-700">${taxAmount.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    )}
                    <tr className="border-t bg-gray-50">
                      <td colSpan={6} className="p-2 text-right font-bold">Total</td>
                      <td className="p-2 text-right font-bold text-primary">${grandTotal.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
              {msg && <p className={`text-sm mb-3 ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
              <div className="flex items-center gap-4">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Creating...' : 'Create PO'}</button>
                {vendorEmail && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="rounded" />
                    Send PO email to supplier
                  </label>
                )}
              </div>
            </form>
          )}

          {/* PO list */}
          {loading ? <p className="text-gray-400">Loading...</p> : (
            <div className="space-y-3">
              {pos.map(po => (
                <div key={po._id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpanded(expanded === po._id ? null : po._id)}
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm">{po.poNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLORS[po.status]}`}>{po.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{po.vendor} · {po.items?.length} item(s) · <span className="font-semibold">${po.totalCost?.toFixed(2)}</span>{po.shippingCost > 0 ? <span className="text-gray-400"> (incl. ${po.shippingCost.toFixed(2)} shipping)</span> : ''}{po.taxAmount > 0 ? <span className="text-gray-400"> + ${po.taxAmount.toFixed(2)} tax</span> : ''}</p>
                      <p className="text-xs text-gray-400">{new Date(po.createdAt).toLocaleDateString()}{po.submittedAt ? ` · Submitted ${new Date(po.submittedAt).toLocaleDateString()}` : ''}{po.receivedAt ? ` · Received ${new Date(po.receivedAt).toLocaleDateString()}` : ''}</p>
                    </div>
                    <span className="text-gray-400">{expanded === po._id ? '▲' : '▼'}</span>
                  </div>

                  {expanded === po._id && (
                    <div className="border-t p-4">
                      {/* Meta info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                        {po.vendorEmail && (
                          <div>
                            <p className="text-xs text-gray-400 mb-0.5">Supplier Email</p>
                            <p className="font-medium">{po.vendorEmail}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Date Submitted</p>
                          <input
                            type="date"
                            defaultValue={po.submittedAt ? new Date(po.submittedAt).toISOString().slice(0,10) : ''}
                            onBlur={e => saveDates(po, e.target.value, po.receivedAt ? new Date(po.receivedAt).toISOString().slice(0,10) : '')}
                            className="border rounded p-1 text-xs w-full"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Date Received</p>
                          <input
                            type="date"
                            defaultValue={po.receivedAt ? new Date(po.receivedAt).toISOString().slice(0,10) : ''}
                            onBlur={e => saveDates(po, po.submittedAt ? new Date(po.submittedAt).toISOString().slice(0,10) : '', e.target.value)}
                            className="border rounded p-1 text-xs w-full"
                          />
                        </div>
                      </div>
                      {po.notes && <p className="text-sm text-gray-600 mb-1 italic">Notes: {po.notes}</p>}
                  {po.shippingCost > 0 && <p className="text-sm text-gray-600 mb-1">Shipping: <span className="font-semibold">${po.shippingCost?.toFixed(2)}</span></p>}
                  {po.taxAmount > 0 && <p className="text-sm text-gray-600 mb-3">Tax ({po.taxRate ?? 7}%): <span className="font-semibold">${po.taxAmount?.toFixed(2)}</span></p>}
                      <table className="w-full text-sm mb-4">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2">Item</th>
                            <th className="text-center p-2">Qty</th>
                            <th className="text-center p-2">Unit</th>
                            <th className="text-right p-2">Unit Cost</th>
                            <th className="text-right p-2">Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.items?.map((item, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{item.name}</td>
                              <td className="p-2 text-center">{item.quantity}</td>
                              <td className="p-2 text-center text-gray-500">{item.unit}</td>
                              <td className="p-2 text-right">${parseFloat(item.unitCost).toFixed(2)}</td>
                              <td className="p-2 text-right font-semibold">${(item.quantity * item.unitCost).toFixed(2)}</td>
                            </tr>
                          ))}
                          {po.shippingCost > 0 && (
                            <tr className="border-t bg-gray-50">
                              <td colSpan={4} className="p-2 text-right text-gray-500">Shipping</td>
                              <td className="p-2 text-right">${po.shippingCost.toFixed(2)}</td>
                            </tr>
                          )}
                          {po.taxAmount > 0 && (
                            <tr className="bg-gray-50">
                              <td colSpan={4} className="p-2 text-right text-gray-500">Tax ({po.taxRate ?? 7}%)</td>
                              <td className="p-2 text-right">${po.taxAmount.toFixed(2)}</td>
                            </tr>
                          )}
                          <tr className="border-t bg-gray-50 font-bold">
                            <td colSpan={4} className="p-2 text-right">Total</td>
                            <td className="p-2 text-right text-primary">${po.totalCost?.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 mr-2">Update status:</span>
                        {['draft', 'submitted', 'received', 'cancelled'].map(s => (
                          <button
                            key={s}
                            disabled={po.status === s}
                            onClick={() => updateStatus(po._id, s)}
                            className={`text-xs px-3 py-1 rounded-full font-semibold border capitalize ${po.status === s ? 'opacity-40 cursor-not-allowed ' + STATUS_COLORS[s] : 'border-gray-300 hover:bg-gray-100'}`}
                          >
                            {s}
                          </button>
                        ))}
                        {po.vendorEmail && (
                          <button onClick={() => sendPOEmail(po)} className="text-xs px-3 py-1 rounded-full font-semibold border border-blue-400 text-blue-600 hover:bg-blue-50">
                            ✉ Send to Supplier
                          </button>
                        )}
                        <button onClick={(e) => startEdit(po, e)} className="text-xs px-3 py-1 rounded-full font-semibold border border-yellow-400 text-yellow-700 hover:bg-yellow-50">
                          ✏ Edit PO
                        </button>
                        <button onClick={() => handleDelete(po._id)} className="ml-auto text-xs text-red-500 hover:text-red-700">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {pos.length === 0 && <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">No purchase orders yet.</div>}
            </div>
          )}
        </div>
      </AdminLayout>
      {/* Edit PO Modal */}
      {editPO && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl mx-4 relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Edit Purchase Order</h2>
              <button type="button" onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Vendor / Supplier *</label>
                <input type="text" value={editPO.vendor} onChange={e => setEditPO(p => ({ ...p, vendor: e.target.value }))} className="w-full border p-2 rounded text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Supplier Email</label>
                <input type="email" value={editPO.vendorEmail} onChange={e => setEditPO(p => ({ ...p, vendorEmail: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="supplier@example.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Date Submitted</label>
                <input type="date" value={editPO.submittedAt} onChange={e => setEditPO(p => ({ ...p, submittedAt: e.target.value }))} className="w-full border p-2 rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Date Received</label>
                <input type="date" value={editPO.receivedAt} onChange={e => setEditPO(p => ({ ...p, receivedAt: e.target.value }))} className="w-full border p-2 rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Notes</label>
                <input type="text" value={editPO.notes} onChange={e => setEditPO(p => ({ ...p, notes: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="Delivery instructions, etc." />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Shipping Cost ($)</label>
                <input type="number" min="0" step="0.01" value={editPO.shippingCost} onChange={e => setEditPO(p => ({ ...p, shippingCost: e.target.value }))} className="w-full border p-2 rounded text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tax Rate (%)</label>
                <input type="number" min="0" step="0.1" value={editPO.taxRate} onChange={e => setEditPO(p => ({ ...p, taxRate: e.target.value }))} className="w-full border p-2 rounded text-sm" />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold">Items *</label>
                <button type="button" onClick={addEditItem} className="text-xs text-primary underline">+ Add Row</button>
              </div>
              <table className="w-full text-sm border rounded overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Item Name</th>
                    <th className="text-center p-2 w-20">Qty</th>
                    <th className="text-center p-2 w-24">PO Unit</th>
                    <th className="text-center p-2 w-28">Unit Cost ($)</th>
                    <th className="text-center p-2 w-16" title="Inventory units per PO unit">Conv.</th>
                    <th className="text-center p-2 w-24" title="Unit in your inventory">Inv. Unit</th>
                    <th className="text-right p-2 w-24">Line Total</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-1">
                        <ItemNameInput
                          value={item.name}
                          onChange={v => updateEditItem(i, 'name', v)}
                          onSelect={s => { updateEditItem(i, 'name', s.name); updateEditItem(i, 'unit', s.unit); updateEditItem(i, 'inventoryUnit', s.unit); }}
                        />
                      </td>
                      <td className="p-1"><input type="number" min="1" value={item.quantity} onChange={e => updateEditItem(i, 'quantity', e.target.value)} className="w-full border p-1 rounded text-sm text-center" required /></td>
                      <td className="p-1"><input type="text" value={item.unit} onChange={e => updateEditItem(i, 'unit', e.target.value)} className="w-full border p-1 rounded text-sm text-center" placeholder="case" /></td>
                      <td className="p-1"><input type="number" min="0" step="0.01" value={item.unitCost} onChange={e => updateEditItem(i, 'unitCost', e.target.value)} className="w-full border p-1 rounded text-sm text-center" placeholder="0.00" required /></td>
                      <td className="p-1"><input type="number" min="1" step="1" value={item.conversionFactor ?? 1} onChange={e => updateEditItem(i, 'conversionFactor', e.target.value)} className="w-full border p-1 rounded text-sm text-center" /></td>
                      <td className="p-1"><input type="text" value={item.inventoryUnit ?? ''} onChange={e => updateEditItem(i, 'inventoryUnit', e.target.value)} className="w-full border p-1 rounded text-sm text-center" placeholder="bags" /></td>
                      <td className="p-2 text-right font-semibold">${editLineTotal(item).toFixed(2)}</td>
                      <td className="p-1 text-center">{editItems.length > 1 && <button type="button" onClick={() => removeEditItem(i)} className="text-red-400 hover:text-red-600">✕</button>}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-gray-50">
                    <td colSpan={6} className="p-2 text-right text-gray-500">Items Subtotal</td>
                    <td className="p-2 text-right text-gray-700">${editItemsTotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                  {editShipping > 0 && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="p-2 text-right text-gray-500">Shipping</td>
                      <td className="p-2 text-right text-gray-700">${editShipping.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  )}
                  {editTaxAmount > 0 && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="p-2 text-right text-gray-500">Tax ({editTaxPct}%)</td>
                      <td className="p-2 text-right text-gray-700">${editTaxAmount.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  )}
                  <tr className="border-t bg-gray-50">
                    <td colSpan={6} className="p-2 text-right font-bold">Total</td>
                    <td className="p-2 text-right font-bold text-primary">${editGrandTotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={editSaving} className="btn-primary disabled:opacity-50">{editSaving ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={cancelEdit} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </ProtectedRoute>
  );
}
