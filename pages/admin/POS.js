'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

const TAX_RATE = 0.07;
const TICKET_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const POS_STATE_KEY = 'bobanest-pos-state-v1';

function isModifierApplicable(group, productId) {
  const applicable = Array.isArray(group?.applicableProducts) ? group.applicableProducts : [];
  if (applicable.length === 0) return true;
  const normalizedProductId = String(productId || '');
  return applicable.some((item) => String(item?._id || item) === normalizedProductId);
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildReceiptHtml(ticket, printerSettings) {
  const lines = Array.isArray(ticket?.lines) ? ticket.lines : [];
  const printedAt = new Date().toLocaleString();
  const printerLabel = printerSettings?.printerName ? `Printer: ${printerSettings.printerName}` : '';

  const lineMarkup = lines.map((line) => {
    const modifierText = Array.isArray(line.modifiers) && line.modifiers.length > 0
      ? `<div class="mods">${line.modifiers.map((mod) => `${escapeHtml(mod.groupName)}: ${escapeHtml((mod.options || []).join(', '))}`).join(' • ')}</div>`
      : '';
    return `
      <div class="line">
        <div class="row">
          <span>${escapeHtml(line.quantity)} x ${escapeHtml(line.productName)}</span>
          <span>${escapeHtml(formatMoney(Number(line.unitPrice || 0) * Number(line.quantity || 0)))}</span>
        </div>
        ${modifierText}
      </div>
    `;
  }).join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${escapeHtml(ticket.ticketNumber)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #111827; }
          .receipt { max-width: 360px; margin: 0 auto; }
          .center { text-align: center; }
          .muted { color: #6b7280; font-size: 12px; }
          .line { border-bottom: 1px dashed #d1d5db; padding: 8px 0; }
          .row { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
          .mods { color: #6b7280; font-size: 12px; margin-top: 4px; }
          .totals { margin-top: 12px; border-top: 2px solid #111827; padding-top: 12px; }
          .totals .row { margin-bottom: 6px; }
          .strong { font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="center">
            <h2>Bobanest</h2>
            <div class="muted">Ticket #${escapeHtml(ticket.ticketNumber)}</div>
            <div class="muted">${escapeHtml(ticket.location || 'N/A')}</div>
            <div class="muted">${escapeHtml(printedAt)}</div>
            ${printerLabel ? `<div class="muted">${escapeHtml(printerLabel)}</div>` : ''}
          </div>
          <div>${lineMarkup}</div>
          <div class="totals">
            <div class="row"><span>Subtotal</span><span>${escapeHtml(formatMoney(ticket.subtotal || 0))}</span></div>
            <div class="row"><span>Discount</span><span>-${escapeHtml(formatMoney(ticket.discountAmount || 0))}</span></div>
            <div class="row"><span>Tax</span><span>${escapeHtml(formatMoney(ticket.tax || 0))}</span></div>
            <div class="row strong"><span>Total</span><span>${escapeHtml(formatMoney(ticket.total || 0))}</span></div>
            <div class="row"><span>Payment</span><span>${escapeHtml(ticket.paymentSummary || '')}</span></div>
            ${ticket.orderNote ? `<div class="muted" style="margin-top:8px;">Note: ${escapeHtml(ticket.orderNote)}</div>` : ''}
          </div>
        </div>
      </body>
    </html>
  `;
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
      if (names.length > 0) modifiers.push({ groupName: group.name, options: names });
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
    if (!selected || (Array.isArray(selected) && selected.length === 0)) return false;
  }
  return true;
}

function getTicketTotals(ticket) {
  const lines = Array.isArray(ticket?.lines) ? ticket.lines : [];
  const subtotal = lines.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 0), 0);

  const discountType = String(ticket?.discountType || 'none');
  const discountValue = Number(ticket?.discountValue || 0);
  const safeDiscountValue = Number.isFinite(discountValue) ? discountValue : 0;
  const discountAmount = discountType === 'percent'
    ? Math.min(subtotal, Math.max(0, (subtotal * safeDiscountValue) / 100))
    : discountType === 'amount'
      ? Math.min(subtotal, Math.max(0, safeDiscountValue))
      : 0;

  const taxable = Math.max(0, subtotal - discountAmount);
  const tax = taxable * TAX_RATE;
  const total = taxable + tax;
  return { subtotal, discountAmount, tax, total };
}

function createTicketNumber(usedSet) {
  for (let tries = 0; tries < 100; tries += 1) {
    let code = '';
    for (let i = 0; i < 8; i += 1) {
      code += TICKET_CHARS[Math.floor(Math.random() * TICKET_CHARS.length)];
    }
    if (!usedSet.has(code)) return code;
  }
  return `T${Date.now()}`.replace(/[^A-Za-z0-9]/g, '');
}

export default function AdminPOSPage() {
  const [products, setProducts] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  const [tickets, setTickets] = useState([]);
  const [completedTickets, setCompletedTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [activeCompletedTicketId, setActiveCompletedTicketId] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedModifierOptions, setSelectedModifierOptions] = useState({});

  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [passcodeApprovedExit, setPasscodeApprovedExit] = useState(false);
  const [fullscreenPasscode, setFullscreenPasscode] = useState('');
  const [posLogo, setPosLogo] = useState('/favicon.ico');
  const [printerSettings, setPrinterSettings] = useState({
    mode: 'browser',
    printerName: '',
    ipAddress: '',
    printCopies: 1,
  });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [printReceiptOnPayment, setPrintReceiptOnPayment] = useState(true);
  const [runtimeHydrated, setRuntimeHydrated] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const applyRuntimeState = (state) => {
      if (!state || typeof state !== 'object') return;
      if (Array.isArray(state.tickets)) setTickets(state.tickets);
      if (Array.isArray(state.completedTickets)) setCompletedTickets(state.completedTickets);
      if (typeof state.activeTicketId === 'string') setActiveTicketId(state.activeTicketId || null);
      if (typeof state.selectedLocation === 'string') setSelectedLocation(state.selectedLocation);
      if (typeof state.activeCompletedTicketId === 'string') {
        setActiveCompletedTicketId(state.activeCompletedTicketId || null);
      }
    };

    const loadInitialState = async () => {
      try {
        const rawState = localStorage.getItem(POS_STATE_KEY);
        if (rawState) {
          const parsed = JSON.parse(rawState);
          applyRuntimeState(parsed);
        }
      } catch (storageError) {
        console.warn('Unable to restore local POS state', storageError);
      }

      try {
        const savedLogo = localStorage.getItem('bobanest-pos-logo');
        if (savedLogo) setPosLogo(savedLogo);
      } catch (storageError) {
        console.warn('Unable to read saved POS logo', storageError);
      }

      try {
        const savedPrinterSettings = localStorage.getItem('bobanest-pos-printer');
        if (savedPrinterSettings) {
          const parsedPrinterSettings = JSON.parse(savedPrinterSettings);
          setPrinterSettings((current) => ({ ...current, ...parsedPrinterSettings }));
        }
      } catch (storageError) {
        console.warn('Unable to read saved printer settings', storageError);
      }

      try {
        const response = await fetch('/api/admin/pos-settings');
        const text = await response.text();
        if (!response.ok) throw new Error(`Failed to load POS settings (${response.status})`);
        const body = text ? JSON.parse(text) : {};
        if (cancelled) return;

        if (typeof body.posLogo === 'string' && body.posLogo.trim()) {
          setPosLogo(body.posLogo);
          try {
            localStorage.setItem('bobanest-pos-logo', body.posLogo);
          } catch (storageError) {
            console.warn('Unable to cache POS logo locally', storageError);
          }
        }
        if (typeof body.fullscreenPasscode === 'string') {
          setFullscreenPasscode(body.fullscreenPasscode);
        }
        if (body.posPrinterSettings && typeof body.posPrinterSettings === 'object') {
          setPrinterSettings((current) => ({ ...current, ...body.posPrinterSettings }));
        }
        if (body.posRuntimeState && typeof body.posRuntimeState === 'object') {
          applyRuntimeState(body.posRuntimeState);
        }
      } catch (loadError) {
        if (cancelled) return;
        console.warn('Unable to load POS settings', loadError);
      } finally {
        if (!cancelled) setRuntimeHydrated(true);
      }
    };

    loadInitialState();
    return () => {
      cancelled = true;
    };
  }, []);

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
      setSelectedLocation((current) => {
        if (safeLocations.length === 0) return '';
        const existingStillValid = safeLocations.some((location) => location.name === current);
        if (existingStillValid) return current;
        const selectable = safeLocations.filter((location) => !location.isComingSoon);
        return selectable[0]?.name || safeLocations[0].name || '';
      });
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

  useEffect(() => {
    if (!runtimeHydrated) return;
    const runtimeState = {
      tickets,
      completedTickets,
      activeTicketId: activeTicketId || '',
      selectedLocation,
      activeCompletedTicketId: activeCompletedTicketId || '',
    };

    try {
      localStorage.setItem(POS_STATE_KEY, JSON.stringify(runtimeState));
    } catch (storageError) {
      console.warn('Unable to persist POS state', storageError);
    }

    fetch('/api/admin/pos-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'posRuntimeState', value: runtimeState }),
    }).catch((syncError) => {
      console.warn('Unable to sync POS state to server', syncError);
    });
  }, [runtimeHydrated, tickets, completedTickets, activeTicketId, selectedLocation, activeCompletedTicketId]);

  useEffect(() => {
    const requiredPasscode = String(fullscreenPasscode || '').trim();
    const onFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);

      if (!inFullscreen && passcodeApprovedExit) {
        setPasscodeApprovedExit(false);
        return;
      }

      if (!inFullscreen && requiredPasscode) {
        const entered = window.prompt('Enter POS passcode to exit full screen');
        if (entered === requiredPasscode) {
          setError('');
          setPasscodeApprovedExit(false);
          return;
        }
        setError('Passcode required to exit full screen.');
        document.documentElement.requestFullscreen().catch(() => {
          setError('Unable to keep POS in fullscreen mode on this device/browser.');
        });
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    onFullscreenChange();
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [fullscreenPasscode, passcodeApprovedExit]);

  useEffect(() => {
    try {
      localStorage.setItem('bobanest-pos-logo', posLogo);
    } catch (storageError) {
      console.warn('Unable to save POS logo', storageError);
    }
  }, [posLogo]);

  const defaultLocation = useMemo(() => {
    const selectable = locations.filter((location) => !location.isComingSoon);
    return selectable[0]?.name || locations[0]?.name || '';
  }, [locations]);

  const activeTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === activeTicketId) || null,
    [tickets, activeTicketId]
  );
  const activeCompletedTicket = useMemo(
    () => completedTickets.find((ticket) => ticket.id === activeCompletedTicketId) || null,
    [completedTickets, activeCompletedTicketId]
  );

  const printReceipt = async (ticket, preparedWindow = null) => {
    if (!ticket) {
      throw new Error('No ticket available to print.');
    }

    const popup = preparedWindow || window.open('', '_blank', 'width=420,height=800');
    if (!popup) {
      throw new Error('The print window was blocked. Please allow popups for Bobanest POS.');
    }

    popup.document.open();
    popup.document.write(buildReceiptHtml(ticket, printerSettings));
    popup.document.close();
    popup.focus();

    await new Promise((resolve) => window.setTimeout(resolve, 300));

    const copies = Math.max(1, Number(printerSettings.printCopies || 1));
    for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
      popup.print();
      if (copyIndex < copies - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    }

    window.setTimeout(() => {
      popup.close();
    }, 600);
  };

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

  const categories = useMemo(
    () => [...new Set(filteredProducts.map((product) => String(product.category || '').trim()).filter(Boolean))],
    [filteredProducts]
  );

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
    return [...groups.filter((group) => !group.required), ...groups.filter((group) => group.required)];
  }, [modifiers, selectedProduct]);

  const ticketTotals = useMemo(
    () => (activeTicket ? getTicketTotals(activeTicket) : { subtotal: 0, discountAmount: 0, tax: 0, total: 0 }),
    [activeTicket]
  );
  const isCashPaymentFlow = Boolean(activeTicket && !activeTicket.isSplitPayment && activeTicket.paymentMethod === 'cash');
  const cashReceivedAmount = Number(cashReceived || 0);
  const cashChangeDue = Math.max(0, cashReceivedAmount - ticketTotals.total);

  const splitPaidTotal = useMemo(() => {
    if (!activeTicket?.isSplitPayment) return 0;
    return Number(activeTicket.splitCash || 0) + Number(activeTicket.splitCard || 0);
  }, [activeTicket]);

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
      if (index === -1) return { ...ticket, lines: [...ticket.lines, line] };
      const nextLines = [...ticket.lines];
      nextLines[index] = { ...nextLines[index], quantity: nextLines[index].quantity + 1 };
      return { ...ticket, lines: nextLines };
    });
  };

  const changeLineQty = (lineKey, nextQty) => {
    updateActiveTicket((ticket) => {
      if (nextQty <= 0) return { ...ticket, lines: ticket.lines.filter((line) => line.lineKey !== lineKey) };
      return {
        ...ticket,
        lines: ticket.lines.map((line) => (line.lineKey === lineKey ? { ...line, quantity: nextQty } : line)),
      };
    });
  };

  const toggleFullscreen = async () => {
    const requiredPasscode = String(fullscreenPasscode || '').trim();
    try {
      if (document.fullscreenElement) {
        if (requiredPasscode) {
          const entered = window.prompt('Enter POS passcode to exit full screen');
          if (entered !== requiredPasscode) {
            setError('Passcode required to exit full screen.');
            return;
          }
        }
        setPasscodeApprovedExit(true);
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
        setError('');
      }
    } catch (fullscreenError) {
      console.error('Fullscreen toggle failed:', fullscreenError);
      setError('Unable to change fullscreen mode on this device/browser.');
      setPasscodeApprovedExit(false);
    }
  };

  const createTicket = () => {
    if (!selectedLocation) {
      setError('Please select a location first.');
      return;
    }

    const usedNumbers = new Set([
      ...tickets.map((ticket) => ticket.ticketNumber),
      ...completedTickets.map((ticket) => ticket.ticketNumber),
    ]);
    const ticketNumber = createTicketNumber(usedNumbers);
    const id = `${ticketNumber}${Date.now()}`;

    const ticket = {
      id,
      ticketNumber,
      label: `Ticket ${ticketNumber}`,
      location: selectedLocation || defaultLocation || '',
      paymentMethod: 'cash',
      isSplitPayment: false,
      splitCash: '',
      splitCard: '',
      discountType: 'none',
      discountValue: '',
      orderNote: '',
      lines: [],
      createdAt: new Date().toISOString(),
    };

    setTickets((prev) => [...prev, ticket]);
    setActiveTicketId(id);
    setActiveCompletedTicketId(null);
    setSelectedCategory('');
    setSelectedProductId('');
    setSelectedModifierOptions({});
    setError('');
    setMessage('');
  };

  const openTicket = (ticketId) => {
    setActiveTicketId(ticketId);
    setActiveCompletedTicketId(null);
    setPaymentDialogOpen(false);
    setSelectedCategory('');
    setSelectedProductId('');
    setSelectedModifierOptions({});
    setError('');
  };

  const openCompletedTicket = (ticketId) => {
    setActiveCompletedTicketId(ticketId);
    setActiveTicketId(null);
    setPaymentDialogOpen(false);
    setSelectedCategory('');
    setSelectedProductId('');
    setSelectedModifierOptions({});
    setError('');
    setMessage('');
  };

  const backToTickets = () => {
    setActiveTicketId(null);
    setActiveCompletedTicketId(null);
    setPaymentDialogOpen(false);
    setSelectedCategory('');
    setSelectedProductId('');
    setSelectedModifierOptions({});
  };

  const voidTicket = () => {
    if (!activeTicket) return;
    setTickets((prev) => prev.filter((ticket) => ticket.id !== activeTicket.id));
    setActiveTicketId(null);
    setSelectedCategory('');
    setSelectedProductId('');
    setSelectedModifierOptions({});
    setError('');
    setActiveCompletedTicketId(null);
    setPaymentDialogOpen(false);
    setMessage(`Ticket #${activeTicket.ticketNumber} voided.`);
  };

  const handleRefundCompletedTicket = async () => {
    if (!activeCompletedTicket) return;
    if (activeCompletedTicket.refundedAt) {
      setError(`Ticket #${activeCompletedTicket.ticketNumber} is already refunded.`);
      return;
    }

    setProcessingRefund(true);
    setError('');
    setMessage('');

    try {
      const itemTotals = new Map();
      for (const line of activeCompletedTicket.lines || []) {
        const currentQty = itemTotals.get(line.productName) || 0;
        itemTotals.set(line.productName, currentQty + Number(line.quantity || 0));
      }

      const refundItems = Array.from(itemTotals.entries()).map(([productName, quantity]) => ({
        productName,
        quantity: -Math.abs(quantity),
      }));

      const response = await fetch('/api/admin/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          items: refundItems,
          note: `POS refund | ticket: ${activeCompletedTicket.ticketNumber} | location: ${activeCompletedTicket.location || 'N/A'}`,
          source: 'manual',
          grossSales: -Math.abs(Number(activeCompletedTicket.subtotal || 0)),
          netSales: -Math.abs(Number(activeCompletedTicket.total || 0)),
          discounts: -Math.abs(Number(activeCompletedTicket.discountAmount || 0)),
          skipInventory: true,
        }),
      });

      const text = await response.text();
      let body = {};
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = {};
        }
      }
      if (!response.ok) {
        throw new Error(body?.error || `Failed to refund ticket (${response.status})`);
      }

      const refundedAt = new Date().toISOString();
      setCompletedTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === activeCompletedTicket.id
            ? { ...ticket, refundedAt, refundReference: body?._id || '' }
            : ticket
        )
      );
      setMessage(`Ticket #${activeCompletedTicket.ticketNumber} refunded successfully.`);
    } catch (refundError) {
      console.error('POS refund failed:', refundError);
      setError(refundError.message || 'Failed to refund ticket.');
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProductId(product._id);
    setSelectedModifierOptions({});
    setError('');

    const groups = modifiers.filter((group) => isModifierApplicable(group, product._id));
    if (groups.length === 0) {
      addLineToActiveTicket(buildLineFromSelection(product, [], {}));
      setSelectedProductId('');
      setSelectedModifierOptions({});
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
    setSelectedProductId('');
    setSelectedModifierOptions({});
    setMessage(`Added ${selectedProduct.name}`);
  };

  const openPaymentDialog = () => {
    if (!activeTicket) return;
    if (!activeTicket.lines.length) {
      setError('Add at least one item before taking payment.');
      return;
    }
    if (activeTicket.isSplitPayment) {
      const difference = Math.abs(splitPaidTotal - ticketTotals.total);
      if (difference > 0.01) {
        setError('Split payment amounts must match the ticket total.');
        return;
      }
    }

    setCashReceived(
      !activeTicket.isSplitPayment && activeTicket.paymentMethod === 'cash'
        ? ticketTotals.total.toFixed(2)
        : ''
    );
    setPrintReceiptOnPayment(true);
    setPaymentDialogOpen(true);
    setError('');
  };

  const closePaymentDialog = () => {
    if (savingOrder) return;
    setPaymentDialogOpen(false);
    setCashReceived('');
    setPrintReceiptOnPayment(true);
  };

  const handleCompleteTicket = async ({ shouldPrintReceipt = false, cashTendered = '' } = {}) => {
    if (!activeTicket) return;
    if (!activeTicket.lines.length) {
      setError('Add at least one item before taking payment.');
      return;
    }
    if (activeTicket.isSplitPayment) {
      const difference = Math.abs(splitPaidTotal - ticketTotals.total);
      if (difference > 0.01) {
        setError('Split payment amounts must match the ticket total.');
        return;
      }
    }

    const tenderedAmount = Number(cashTendered || 0);
    if (isCashPaymentFlow && tenderedAmount + 0.001 < ticketTotals.total) {
      setError('Cash received must be equal to or more than the total.');
      return;
    }

    const shouldTriggerPrint = shouldPrintReceipt && ['browser', 'network', 'bluetooth'].includes(String(printerSettings.mode || 'browser'));
    const printWindow = shouldTriggerPrint ? window.open('', '_blank', 'width=420,height=800') : null;

    setSavingOrder(true);
    setError('');
    setMessage('');

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

      const paymentSummary = activeTicket.isSplitPayment
        ? `split cash ${formatMoney(activeTicket.splitCash || 0)} + card ${formatMoney(activeTicket.splitCard || 0)}`
        : isCashPaymentFlow
          ? `cash received ${formatMoney(tenderedAmount)} | change ${formatMoney(Math.max(0, tenderedAmount - ticketTotals.total))}`
          : activeTicket.paymentMethod;
      const discountSummary = ticketTotals.discountAmount > 0
        ? activeTicket.discountType === 'percent'
          ? `${Number(activeTicket.discountValue || 0)}%`
          : formatMoney(activeTicket.discountValue || 0)
        : '';

      const noteParts = [
        'POS sale',
        `ticket: ${activeTicket.ticketNumber}`,
        `location: ${activeTicket.location || selectedLocation || defaultLocation || 'N/A'}`,
        `payment: ${paymentSummary}`,
        discountSummary ? `discount: ${discountSummary}` : '',
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
          grossSales: ticketTotals.subtotal,
          netSales: ticketTotals.total,
          discounts: ticketTotals.discountAmount,
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

      const completedRecord = {
        id: activeTicket.id,
        ticketNumber: activeTicket.ticketNumber,
        location: activeTicket.location || selectedLocation || defaultLocation || 'N/A',
        lines: activeTicket.lines,
        subtotal: ticketTotals.subtotal,
        discountAmount: ticketTotals.discountAmount,
        discountType: activeTicket.discountType || 'none',
        discountValue: Number(activeTicket.discountValue || 0),
        tax: ticketTotals.tax,
        total: ticketTotals.total,
        paymentSummary,
        orderNote: activeTicket.orderNote,
        completedAt: new Date().toISOString(),
      };

      setCompletedTickets((prev) => [completedRecord, ...prev].slice(0, 30));
      setTickets((prev) => prev.filter((ticket) => ticket.id !== activeTicket.id));
      setActiveTicketId(null);
      setActiveCompletedTicketId(completedRecord.id);
      setPaymentDialogOpen(false);
      setCashReceived('');
      setPrintReceiptOnPayment(true);
      setSelectedCategory('');
      setSelectedProductId('');
      setSelectedModifierOptions({});

      if (shouldTriggerPrint) {
        try {
          await printReceipt(completedRecord, printWindow);
          setMessage(`Ticket ${activeTicket.ticketNumber} completed and receipt printed.`);
        } catch (printError) {
          console.error('POS receipt print error:', printError);
          setMessage(`Ticket ${activeTicket.ticketNumber} completed, but receipt printing needs browser permission or printer selection.`);
        }
      } else {
        setMessage(`Ticket ${activeTicket.ticketNumber} completed. Payment recorded.`);
      }
    } catch (submitError) {
      console.error('POS ticket save error:', submitError);
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
      setError(submitError.message || 'Failed to complete ticket.');
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout hideHeader={Boolean(activeTicket)}>
        <div className="p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <img src={posLogo} alt="Bobanest" className="w-8 h-8 rounded" />
              <h1 className="text-2xl md:text-3xl font-bold">Bobanest</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="border rounded-lg px-4 py-2 text-sm font-medium bg-white hover:bg-gray-50"
              >
                {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              </button>
            </div>
          </div>

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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold mb-3">Open Tickets</h3>
                  {tickets.length === 0 ? (
                    <p className="text-sm text-gray-500">No open tickets yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((ticket) => {
                        const totals = getTicketTotals(ticket);
                        return (
                          <button
                            key={ticket.id}
                            type="button"
                            onClick={() => openTicket(ticket.id)}
                            className="w-full text-left border rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition"
                          >
                            <p className="font-semibold">#{ticket.ticketNumber}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {ticket.location || 'No location'} • {ticket.lines.length} line(s) • {formatMoney(totals.total)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="font-semibold mb-3">Completed Tickets</h3>
                  {completedTickets.length === 0 ? (
                    <p className="text-sm text-gray-500">No completed tickets yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {completedTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => openCompletedTicket(ticket.id)}
                          className={`w-full text-left border rounded-lg p-3 transition ${
                            activeCompletedTicketId === ticket.id
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                          }`}
                        >
                          <p className="font-semibold text-sm">#{ticket.ticketNumber}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {ticket.location} • {new Date(ticket.completedAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {ticket.lines.length} line(s) • {ticket.paymentSummary} • {formatMoney(ticket.total)}
                          </p>
                          {ticket.refundedAt ? (
                            <p className="text-xs font-semibold text-red-600 mt-1">
                              Refunded on {new Date(ticket.refundedAt).toLocaleString()}
                            </p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {activeCompletedTicket ? (
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Completed Ticket #{activeCompletedTicket.ticketNumber}</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {activeCompletedTicket.location} • {new Date(activeCompletedTicket.completedAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveCompletedTicketId(null)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-3 space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                    {(activeCompletedTicket.lines || []).map((line) => (
                      <div key={`${activeCompletedTicket.id}-${line.lineKey}`} className="border rounded p-2 text-sm">
                        <p className="font-medium">{line.quantity} x {line.productName}</p>
                        {line.modifiers?.length ? (
                          <p className="text-xs text-gray-600 mt-1">
                            {line.modifiers.map((mod) => `${mod.groupName}: ${mod.options.join(', ')}`).join(' • ')}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t pt-3 text-sm space-y-1">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(activeCompletedTicket.subtotal)}</span></div>
                    <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(activeCompletedTicket.discountAmount || 0)}</span></div>
                    <div className="flex justify-between"><span>Tax</span><span>{formatMoney(activeCompletedTicket.tax)}</span></div>
                    <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(activeCompletedTicket.total)}</span></div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await printReceipt(activeCompletedTicket);
                          setMessage(`Ticket #${activeCompletedTicket.ticketNumber} sent to print.`);
                          setError('');
                        } catch (printError) {
                          console.error('POS reprint error:', printError);
                          setError(printError.message || 'Unable to print receipt.');
                        }
                      }}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700"
                    >
                      Reprint Receipt
                    </button>
                    <button
                      type="button"
                      onClick={handleRefundCompletedTicket}
                      disabled={processingRefund || Boolean(activeCompletedTicket.refundedAt)}
                      className="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60"
                    >
                      {activeCompletedTicket.refundedAt ? 'Refunded' : processingRefund ? 'Refunding...' : 'Refund Ticket'}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Ticket #{activeTicket.ticketNumber}</h2>
                  <button type="button" onClick={backToTickets} className="text-sm text-blue-600 hover:underline">
                    Back to Tickets
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">Location: {activeTicket.location || selectedLocation || defaultLocation || 'N/A'}</p>

                <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
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

                <div className="mt-4">
                  <label className="block text-xs text-gray-600 mb-1">Discount</label>
                  <div className="grid grid-cols-[1fr_1fr] gap-2">
                    <select
                      value={activeTicket.discountType || 'none'}
                      onChange={(e) =>
                        updateActiveTicket({
                          discountType: e.target.value,
                          discountValue: e.target.value === 'none' ? '' : activeTicket.discountValue || '',
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                    >
                      <option value="none">No discount</option>
                      <option value="percent">Percentage (%)</option>
                      <option value="amount">Fixed amount ($)</option>
                    </select>
                    {(activeTicket.discountType || 'none') === 'none' ? (
                      <input
                        type="number"
                        value=""
                        readOnly
                        placeholder="Discount value"
                        className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-sm"
                      />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={activeTicket.discountValue}
                        onChange={(e) => updateActiveTicket({ discountValue: e.target.value })}
                        placeholder={activeTicket.discountType === 'percent' ? '0 - 100' : 'Amount'}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t pt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(ticketTotals.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(ticketTotals.discountAmount)}</span></div>
                  <div className="flex justify-between"><span>Tax (7%)</span><span>{formatMoney(ticketTotals.tax)}</span></div>
                  <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatMoney(ticketTotals.total)}</span></div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs text-gray-600 mb-1">Payment</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      id="split-payment"
                      type="checkbox"
                      checked={Boolean(activeTicket.isSplitPayment)}
                      onChange={(e) =>
                        updateActiveTicket({
                          isSplitPayment: e.target.checked,
                          splitCash: e.target.checked ? activeTicket.splitCash || '' : '',
                          splitCard: e.target.checked ? activeTicket.splitCard || '' : '',
                        })
                      }
                    />
                    <label htmlFor="split-payment" className="text-sm">Split payment</label>
                  </div>

                  {!activeTicket.isSplitPayment ? (
                    <select
                      value={activeTicket.paymentMethod}
                      onChange={(e) => updateActiveTicket({ paymentMethod: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 bg-white text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cash</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={activeTicket.splitCash}
                          onChange={(e) => updateActiveTicket({ splitCash: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Card</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={activeTicket.splitCard}
                          onChange={(e) => updateActiveTicket({ splitCard: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 col-span-2">
                        Paid: {formatMoney(splitPaidTotal)} / Total: {formatMoney(ticketTotals.total)}
                      </p>
                    </div>
                  )}
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

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={voidTicket}
                    disabled={savingOrder}
                    className="bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60"
                  >
                    Void Ticket
                  </button>
                  <button
                    type="button"
                    onClick={openPaymentDialog}
                    disabled={savingOrder}
                    className="bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60"
                  >
                    {savingOrder ? 'Processing Payment...' : 'Take Payment'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 space-y-4">
                <h2 className="text-xl font-semibold">Menu</h2>

                {!selectedProduct ? (
                  <>
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
                              className="border rounded-lg p-3 text-left transition hover:border-blue-400"
                            >
                              <p className="font-semibold text-sm">{item.name}</p>
                              <p className="text-xs text-gray-500 mt-1">{formatMoney(item.price)}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium">Modifiers</p>
                        <p className="text-xs text-gray-500 mt-0.5">{selectedProduct.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductId('');
                          setSelectedModifierOptions({});
                        }}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Back
                      </button>
                    </div>

                    {selectedProductModifierGroups.length === 0 ? (
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
                )}
              </div>
            </div>
          )}
        </div>

        {paymentDialogOpen && activeTicket ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">Take payment</p>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">Ticket #{activeTicket.ticketNumber}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Total due: <span className="font-semibold text-gray-900">{formatMoney(ticketTotals.total)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePaymentDialog}
                  disabled={savingOrder}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700">Payment method</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {activeTicket.isSplitPayment ? 'Split payment' : activeTicket.paymentMethod === 'cash' ? 'Cash' : 'Card'}
                  </p>
                </div>

                {isCashPaymentFlow ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cash received</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="Enter cash amount"
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-gray-200 p-3">
                        <p className="text-xs text-gray-500">Charge</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">{formatMoney(ticketTotals.total)}</p>
                      </div>
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                        <p className="text-xs text-green-700">Return</p>
                        <p className="text-lg font-bold text-green-700 mt-1">{formatMoney(cashChangeDue)}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="block text-sm font-semibold text-gray-700 mb-2">Print receipt?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintReceiptOnPayment(true)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                        printReceiptOnPayment ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintReceiptOnPayment(false)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                        !printReceiptOnPayment ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={closePaymentDialog}
                  disabled={savingOrder}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCompleteTicket({
                      shouldPrintReceipt: printReceiptOnPayment,
                      cashTendered: cashReceived,
                    })
                  }
                  disabled={savingOrder || (isCashPaymentFlow && cashReceivedAmount + 0.001 < ticketTotals.total)}
                  className="rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {savingOrder ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        ) : null}


      </AdminLayout>
    </ProtectedRoute>
  );
}
