'use client';
import { useEffect, useState } from 'react';
import { useCart } from './CartContext';

export const LAST_ORDER_KEY = 'bobanestLastOrder';

export function saveLastOrder(items) {
  try {
    const clean = (items || [])
      .filter(i => !i.isFreeBogo)
      .map(i => ({ id: i.id || i._id, name: i.name, price: i.price, imageUrl: i.imageUrl, quantity: i.quantity, modifiers: i.modifiers || [] }));
    if (clean.length) localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(clean));
  } catch {}
}

// "Order your usual" button for returning customers
export default function ReorderUsual({ onDone, className = '' }) {
  const { cartItems, addToCart } = useCart();
  const [last, setLast] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_ORDER_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) setLast(parsed);
    } catch {}
  }, []);

  if (!last || cartItems.length > 0) return null;

  const summary = last.map(i => `${i.quantity}× ${i.name}`).join(', ');

  const reorder = () => {
    last.forEach(item => addToCart({ ...item, _id: item.id }));
    if (onDone) onDone();
  };

  return (
    <button
      type="button"
      onClick={reorder}
      className={`text-left rounded-2xl bg-[#e8a33d] text-[#1a0f0c] px-5 py-3 font-bold shadow hover:bg-amber-400 transition ${className}`}
    >
      <span className="block text-xs uppercase tracking-wider opacity-70">Order your usual</span>
      <span className="block text-sm line-clamp-2">{summary}</span>
    </button>
  );
}
