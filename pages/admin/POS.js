'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

const TAX_RATE = 0.07;

function isModifierApplicable(group, productId) {
  const applicable = Array.isArray(group?.applicableProducts) ? group.applicableProducts : [];
  if (applicable.length === 0) return true;
  const normalizedProductId = String(productId || '');
  return applicable.some((item) => String(item?._id || item) === normalizedProductId);
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function buildLineFromSelection(product, groups, selectedOptions) {
  let additional = 0;
  const modifiers = [];

  for (const group of groups) {
    const selected = selectedOptions[group._id];
    if (!selected) continue;

    if (Array.isArray(selected)) {
      const names = [];
      for (const optionId of selected) {
        const option = (group.options || []).find((opt) => String(opt._id) === String(optionId));
        if (!option) continue;
        names.push(option.name);
        additional += Number(option.price || 0);
      }
      if (names.length > 0) {
        modifiers.push({ groupName: group.name, options: names });
      }
      continue;
    }

    const option = (group.options || []).find((opt) => String(opt._id) === String(selected));
    if (!option) continue;
    additional += Number(option.price || 0);
    modifiers.push({ groupName: group.name, options: [option.name] });
  }

  const unitPrice = Number(product?.price || 0) + additional;
  const modifierKey = JSON.stringify(modifiers);

  return {
    lineKey: `${product._id}::${modifierKey}`,
    productId: product._id,
    productName: product.name,
    unitPrice,
    modifiers,
    quantity: 1,
  };
}

function hasRequiredSelections(groups, selectedOptions) {
  for (const group of groups) {
    if (!group.required) continue;
    const selected = selectedOptions[group._id];
    if (!selected || (Array.isArray(selected) && selected.length === 0)) {
      return false;
    }
  }
  return true;
}

function getTicketTotal(lines) {
  const subtotal = lines.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 0), 0);
  const tax = subtotal * TAX_RATE;
  return subtotal + tax;
}

export default function AdminPOSPage() {
  const ticketCounter = useRef(0);
  const [products, setProducts] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedModifierOptions, setSelectedModifierOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const readJson = async (url, fallback = []) => {
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok || !text) return fallback;
      try {
        return JSON.parse(text);
      } catch {
        return fallback;
      }
    };

    const load = async () => {
      setLoading(true);
      const [productsData, modifiersData, locationsData] = await Promise.all([
        readJson('/api/admin/products', []),
        readJson('/api/admin/modifiers', []),
        readJson('/api/admin/locations', []),
      ]);

      if (cancelled) return;

      const safeProducts = Array.isArray(productsData) ? productsData : [];
      const safeModifiers = Array.isArray(modifiersData) ? modifiersData : [];
      const safeLocations = Array.isArray(locationsData)
        ? locationsData.filter((location) => location.isActive !== false)
        : [];

      setProducts(safeProducts);
      setModifiers(safeModifiers);
      setLocations(safeLocations);
      if (safeLocations.length > 0) {
        const selectable = safeLocations.filter((location) => !location.isComingSoon);
        setSelectedLocation(selectable[0]?.name || safeLocations[0].name || '');
      }
      setLoading(false);
    };

    load().catch((loadError) => {
      console.error('Failed to load POS data', loadError);
      if (cancelled) return;
      setError('Failed to load POS data. Please refresh.');
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const defaultLocation = useMemo(() => {
    const selectable = locations.filter((location) => !location.isComingSoon);
    return selectable[0]?.name || locations[0]?.name || '';
  }, [locations]);

  const activeTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === activeTicketId) || null,
    [tickets, activeTicketId]
  );

  const filteredProducts = useMemo(() => {
    if (!activeTicket) return [];

    const baseProducts = products.filter((product) => product.inStock !== false);
    if (!selectedLocation) return baseProducts;

    const locationMatched = baseProducts.filter((product) => {
      const assigned = Array.isArray(product.locations) ? product.locations : [];
      if (assigned.length === 0) return true;
      return assigned.includes(selectedLocation);
    });

    return locationMatched.length > 0 ? locationMatched : baseProducts;
  }, [products, activeTicket, selectedLocation]);

  const categories = useMemo(() => {
    return [...new Set(filteredProducts.map((product) => String(product.category || '').trim()).filter(Boolean))];
  }, [filteredProducts]);

  useEffect(() => {
    if (!activeTicket) return;
    if (categories.length === 0) {
      setSelectedCategory('');
      setSelectedProductId('');
      setSelectedModifierOptions({});
      return;
    }
    if (!selectedCategory || !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
      setSelectedProductId('');
      setSelectedModifierOptions({});
    }
  }, [categories, selectedCategory, activeTicket]);

  const categoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    return filteredProducts.filter((product) => String(product.category || '').trim() === selectedCategory);
  }, [filteredProducts, selectedCategory]);

  const selectedProduct = useMemo(
    () => categoryItems.find((product) => String(product._id) === String(selectedProductId)) || null,
    [categoryItems, selectedProductId]
  );

  const selectedProductModifierGroups = useMemo(() => {
    if (!selectedProduct) return [];
    const groups = modifiers.filter((group) => isModifierApplicable(group, selectedProduct._id));
    return [
      ...groups.filter((group) => !group.required),
      ...groups.filter((group) => group.required),
    ];
  }, [modifiers, selectedProduct]);

  const ticketSubtotal = useMemo(() => {
    if (!activeTicket) return 0;
    return activeTicket.lines.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 0), 0);
  }, [activeTicket]);

  const ticketTax = ticketSubtotal * TAX_RATE;
  const ticketTotal = ticketSubtotal + ticketTax;

  const updateActiveTicket = (updater) => {
    if (!activeTicketId) return;
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id !== activeTicketId) return ticket;
        return typeof updater === 'function' ? updater(ticket) : { ...ticket, ...updater };
      })
    );
  };

  const addLineToActiveTicket = (line) => {
    updateActiveTicket((ticket) => {
      const index = ticket.lines.findIndex((item) => item.lineKey === line.lineKey);
      if (index === -1) {
        return { ...ticket, lines: [...ticket.lines, line] };
      }
      const nextLines = [...ticket.lines];
      nextLines[index] = { ...nextLines[index], quantity: nextLines[index].quantity + 1 };
      return { ...ticket, lines: nextLines };
    });
  };

  const changeLineQty = (lineKey, nextQty) => {
    updateActiveTicket((ticket) => {
      if (nextQty <= 0) {
        return { ...ticket, lines: ticket.lines.filter((line) => line.lineKey !== lineKey) };
      }
      return {
        ...ticket,
        lines: ticket.lines.map((line) =>
          line.lineKey === lineKey ? { ...line, quantity: nextQty } : line
        ),
      };
    });
  };

  const createTicket = () => {
    if (!selectedLocation) {
      setError('Please select a location first.');
      return;
    }
    ticketCounter.current += 1;
    const id = `ticket-${Date.now()}-${ticketCounter.current}`;
    const ticket = {
      id,
      label: `Ticket ${ticketCounter.current}`,
      paymentMethod: 'cash',
      orderNote: '',
      lines: [],
      createdAt: new Date().toISOString(),
    };
    setTickets((prev) => [...prev, ticket]);
    setActiveTicketId(id);
    setSelectedCategory('');
    setSelectedProductId('');
    setSelectedModifierOptions({});
    setError('');
    setMessage('');
  };

  const openTicket = (ticketId) => {
    setActiveTicketId(ticketId);
    setSelectedCategory('');
    setSelectedProductId('');
    setSelectedModifierOptions({});
    setError('');
  };

  const backToTickets = () => {
    setActiveTicketId(null);
    setSelectedCategory('');
    setSelectedProductId('');
    setSelectedModifierOptions({});
  };

  const handleSelectProduct = (product) => {
    setSelectedProductId(product._id);
    setSelectedModifierOptions({});
    setError('');

    const groups = modifiers.filter((group) => isModifierApplicable(group, product._id));
    if (groups.length === 0) {
      addLineToActiveTicket(buildLineFromSelection(product, [], {}));
      setMessage(`Added ${product.name}`);
    }
  };

  const handleModifierChoice = (group, optionId) => {
    if (!selectedProduct || !activeTicket) return;

    const nextSelection = { ...selectedModifierOptions };
    const current = nextSelection[group._id];
    if (group.multiple) {
      const currentValues = Array.isArray(current) ? current : [];
      nextSelection[group._id] = currentValues.includes(optionId)
        ? currentValues.filter((id) => id !== optionId)
        : [...currentValues, optionId];
    } else {
      nextSelection[group._id] = optionId;
    }
    setSelectedModifierOptions(nextSelection);

    if (!hasRequiredSelections(selectedProductModifierGroups, nextSelection)) return;

    const line = buildLineFromSelection(selectedProduct, selectedProductModifierGroups, nextSelection);
    addLineToActiveTicket(line);
    setSelectedModifierOptions({});
    setMessage(`Added ${selectedProduct.name}`);
  };

  const handleCompleteTicket = async () => {
    if (!activeTicket) return;

    setError('');
    setMessage('');

    if (activeTicket.lines.length === 0) {
      setError('Add at least one item before completing this ticket.');
      return;
    }

    setSavingOrder(true);
    try {
      const itemTotals = new Map();
      for (const line of activeTicket.lines) {
        const currentQty = itemTotals.get(line.productName) || 0;
        itemTotals.set(line.productName, currentQty + Number(line.quantity || 0));
      }

      const items = Array.from(itemTotals.entries()).map(([productName, quantity]) => ({
        productName,
        quantity,
      }));

      const lineSummary = activeTicket.lines
        .map((line) => {
          const mods = line.modifiers.length > 0
            ? ` [${line.modifiers.map((mod) => `${mod.groupName}: ${mod.options.join(', ')}`).join('; ')}]`
            : '';
          return `${line.quantity}x ${line.productName}${mods}`;
        })
        .join(' || ');

      const noteParts = [
        `POS sale`,
        `ticket: ${activeTicket.label}`,
        `location: ${selectedLocation || defaultLocation || 'N/A'}`,
        `payment: ${activeTicket.paymentMethod}`,
        activeTicket.orderNote ? `note: ${activeTicket.orderNote}` : '',
        lineSummary ? `lines: ${lineSummary}` : '',
      ].filter(Boolean);

      const response = await fetch('/api/admin/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          items,
          note: noteParts.join(' | '),
          source: 'manual',
          grossSales: ticketSubtotal,
          netSales: ticketTotal,
          discounts: 0,
        }),
      });

      const responseText = await response.text();
      let body = {};
      if (responseText) {
        try {
          body = JSON.parse(responseText);
        } catch {
          body = {};
        }
      }

      if (!response.ok) {
        throw new Error(body?.error || `Failed to save order (${response.status})`);
      }

      const completedLabel = activeTicket.label;
      setTickets((prev) => prev.filter((ticket) => ticket.id !== activeTicket.id));
      setActiveTicketId(null);
      setSelectedCategory('');
      setSelectedProductId('');
      setSelectedModifierOptions({});
      setMessage(`${completedLabel} completed. Inventory deductions processed: ${body?.deductions ?? 0}.`);
    } catch (submitError) {
      console.error('POS ticket save error:', submitError);
      setError(submitError.message || 'Failed to complete ticket.');
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-6 lg:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">POS</h1>

          {error ? <div className="mb-4 rounded-lg bg-red-100 text-red-700 px-4 py-3 text-sm">{error}</div> : null}
          {message ? <div className="mb-4 rounded-lg bg-green-100 text-green-700 px-4 py-3 text-sm">{message}</div> : null}

          {loading ? (
            <div className="bg-white rounded-lg p-6 shadow">Loading POS data...</div>
          ) : !activeTicket ? (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Tickets</h2>
                  <p className="text-sm text-gray-500">Start a new ticket or continue an open ticket.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="border rounded-lg px-3 py-2 bg-white text-sm"
                  >
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option
                        key={location._id || location.slug || location.name}
                        value={location.name}
                        disabled={!!location.isComingSoon}
                      >
                        {location.name}{location.isComingSoon ? ' (Coming Soon)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={createTicket}
                    className="bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    New Ticket
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                {tickets.length === 0 ? (
                  <p className="text-sm text-gray-500">No open tickets yet.</p>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => openTicket(ticket.id)}
                        className="w-full text-left border rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition"
                      >
                        <p className="font-semibold">{ticket.label}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedLocation || 'No location'} • {ticket.lines.length} line item(s) • {formatMoney(getTicketTotal(ticket.lines))}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{activeTicket.label}</h2>
                  <button type="button" onClick={backToTickets} className="text-sm text-blue-600 hover:underline">
                    Back to Tickets
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">Location: {selectedLocation || defaultLocation || 'N/A'}</p>

                <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                  {activeTicket.lines.length === 0 ? (
                    <p className="text-sm text-gray-500">No items yet. Use the menu on the right.</p>
                  ) : (
                    activeTicket.lines.map((line) => (
                      <div key={line.lineKey} className="border rounded-lg p-3">
                        <p className="font-medium text-sm">{line.productName}</p>
                        {line.modifiers.length > 0 ? (
                          <p className="text-xs text-gray-500 mt-1">
                            {line.modifiers.map((mod) => `${mod.groupName}: ${mod.options.join(', ')}`).join(' • ')}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => changeLineQty(line.lineKey, line.quantity - 1)}
                              className="w-8 h-8 rounded border text-lg leading-none"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                            <button
                              type="button"
                              onClick={() => changeLineQty(line.lineKey, line.quantity + 1)}
                              className="w-8 h-8 rounded border text-lg leading-none"
                            >
                              +
                            </button>
                          </div>
                          <p className="font-semibold text-sm">{formatMoney(line.unitPrice * line.quantity)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 border-t pt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(ticketSubtotal)}</span></div>
                  <div className="flex justify-between"><span>Tax (7%)</span><span>{formatMoney(ticketTax)}</span></div>
                  <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatMoney(ticketTotal)}</span></div>
                </div>

                <div className="mt-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Payment</label>
                    <select
                      value={activeTicket.paymentMethod}
                      onChange={(e) => updateActiveTicket({ paymentMethod: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-gray-600 mb-1">Ticket note</label>
                  <textarea
                    rows={2}
                    value={activeTicket.orderNote}
                    onChange={(e) => updateActiveTicket({ orderNote: e.target.value })}
                    className="w-full border rounded-lg p-2 text-sm"
                    placeholder="Optional note"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCompleteTicket}
                  disabled={savingOrder}
                  className="mt-4 w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60"
                >
                  {savingOrder ? 'Completing Ticket...' : 'Complete Ticket'}
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-4 space-y-4">
                <h2 className="text-xl font-semibold">Menu</h2>

                <div>
                  <p className="text-sm font-medium mb-2">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category);
                          setSelectedProductId('');
                          setSelectedModifierOptions({});
                        }}
                        className={`px-3 py-2 rounded-full text-sm font-medium ${
                          selectedCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Items</p>
                  {!selectedCategory ? (
                    <p className="text-sm text-gray-500">Select a category to view items.</p>
                  ) : categoryItems.length === 0 ? (
                    <p className="text-sm text-gray-500">No items under this category for the selected location.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {categoryItems.map((item) => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => handleSelectProduct(item)}
                          className={`border rounded-lg p-3 text-left transition ${
                            String(selectedProductId) === String(item._id)
                              ? 'border-blue-600 bg-blue-50'
                              : 'hover:border-blue-400'
                          }`}
                        >
                          <p className="font-semibold text-sm">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatMoney(item.price)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Modifiers</p>
                  {!selectedProduct ? (
                    <p className="text-sm text-gray-500">Select an item to view modifiers.</p>
                  ) : selectedProductModifierGroups.length === 0 ? (
                    <p className="text-sm text-gray-500">No modifiers for this item. Item was added directly.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedProductModifierGroups.map((group) => {
                        const selected = selectedModifierOptions[group._id];
                        return (
                          <div key={group._id} className="border rounded-lg p-3">
                            <p className="text-sm font-semibold mb-2">
                              {group.name}
                              {group.required ? <span className="text-red-500 ml-1">*</span> : null}
                              {group.multiple ? <span className="text-xs text-gray-500 ml-2">(Multiple)</span> : null}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(group.options || []).map((option) => {
                                const active = group.multiple
                                  ? Array.isArray(selected) && selected.some((id) => String(id) === String(option._id))
                                  : String(selected || '') === String(option._id);
                                return (
                                  <button
                                    key={option._id}
                                    type="button"
                                    onClick={() => handleModifierChoice(group, String(option._id))}
                                    className={`px-3 py-2 rounded-lg text-xs border ${
                                      active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                                    }`}
                                  >
                                    {option.name}
                                    {Number(option.price || 0) > 0 ? ` (+${formatMoney(option.price)})` : ''}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-xs text-gray-500">
                        Item is added to the ticket automatically once all required modifiers are selected.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
