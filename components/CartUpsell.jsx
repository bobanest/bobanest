'use client';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from './CartContext';

const DRINK_PATTERN = /milk|fruit|signature|special|smooth|tea|coffee|drink|boba|slush|latte/i;

// Suggests snacks/add-ons that are not already in the cart
export default function CartUpsell({ dark = true }) {
  const { cartItems, addToCart } = useCart();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/products')
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (!cancelled && Array.isArray(d)) setProducts(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const suggestions = useMemo(() => {
    const inCart = new Set(cartItems.map(i => String(i.id || i._id)));
    return products
      .filter(p => p.inStock !== false && Number(p.price) > 0)
      .filter(p => p.category && !DRINK_PATTERN.test(p.category))
      .filter(p => !inCart.has(String(p._id)))
      .slice(0, 3);
  }, [products, cartItems]);

  if (cartItems.length === 0 || suggestions.length === 0) return null;

  const titleCls = dark ? 'text-[#b89070]' : 'text-gray-600';
  const cardCls = dark ? 'bg-[#2a1812] border-white/10 text-[#f5e6c8]' : 'bg-white border-gray-200 text-gray-800';

  return (
    <div>
      <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${titleCls}`}>Add a treat</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map(p => (
          <div key={p._id} className={`flex-shrink-0 w-36 rounded-xl border p-2 ${cardCls}`}>
            {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-16 object-contain rounded-lg mb-1" />}
            <p className="text-xs font-semibold leading-snug line-clamp-2">{p.name}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-bold text-[#e8a33d]">${Number(p.price).toFixed(2)}</span>
              <button
                type="button"
                onClick={() => addToCart({ id: p._id, _id: p._id, name: p.name, price: p.price, imageUrl: p.imageUrl, quantity: 1, modifiers: [] })}
                className="bg-[#e8a33d] text-[#1a0f0c] text-xs font-extrabold px-2 py-1 rounded-full"
              >
                + Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
