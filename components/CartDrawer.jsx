'use client';
import { useCart } from './CartContext';
import Link from 'next/link';
import { useEffect } from 'react';

export default function CartDrawer() {
  const { cartItems, totalItems, totalPrice, cartOpen, closeCart, updateQuantity, removeFromCart } = useCart();

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (cartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen]);

  if (!cartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-[#1a0f0c] border-l border-white/10 z-[70] flex flex-col shadow-2xl animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧋</span>
            <h2 className="text-xl font-extrabold text-[#f5e6c8]">Your Cart</h2>
            {totalItems > 0 && (
              <span className="bg-[#e8a33d] text-[#1a0f0c] text-xs font-extrabold px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="text-[#b89070] hover:text-[#f5e6c8] transition p-1 rounded-lg hover:bg-white/5"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart items — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="text-6xl mb-4 opacity-60">🧋</div>
              <p className="text-[#b89070] font-semibold text-lg">Your cart is empty</p>
              <p className="text-[#6b4e37] text-sm mt-2">Add some drinks to get started!</p>
              <button
                onClick={closeCart}
                className="mt-6 bg-[#e8a33d] text-[#1a0f0c] font-bold px-6 py-2.5 rounded-full hover:bg-amber-400 transition text-sm"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            cartItems.map((item, idx) => (
              <div
                key={`${item.id || item._id}-${idx}`}
                className="bg-[#2a1812] rounded-2xl p-4 border border-white/8 flex gap-3 hover:border-white/15 transition"
              >
                {item.imageUrl && (
                  <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-[#150d09] overflow-hidden flex items-center justify-center">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-[#f5e6c8] text-sm leading-snug">{item.name}</p>
                    {!item.isFreeBogo && (
                      <button
                        onClick={() => removeFromCart(item.id || item._id, item.modifiers)}
                        className="text-[#6b4e37] hover:text-red-400 transition flex-shrink-0 text-xs mt-0.5"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-[#6b4e37] text-xs mt-1 leading-relaxed">
                      {item.modifiers.map(m => `${m.groupName}: ${m.options.join(', ')}`).join(' · ')}
                    </p>
                  )}

                  {item.isFreeBogo ? (
                    <span className="inline-block bg-[#4a7c30] text-white text-xs px-2 py-0.5 rounded-full mt-1 font-semibold">
                      🎁 Free BOGO
                    </span>
                  ) : (
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id || item._id, item.quantity - 1, item.modifiers)}
                          className="w-7 h-7 rounded-full bg-[#150d09] border border-white/15 text-[#f5e6c8] flex items-center justify-center hover:border-[#e8a33d]/60 transition text-sm font-bold"
                        >
                          −
                        </button>
                        <span className="text-[#f5e6c8] font-bold text-sm w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id || item._id, item.quantity + 1, item.modifiers)}
                          className="w-7 h-7 rounded-full bg-[#150d09] border border-white/15 text-[#f5e6c8] flex items-center justify-center hover:border-[#e8a33d]/60 transition text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[#e8a33d] font-extrabold text-sm">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer — checkout */}
        {cartItems.length > 0 && (
          <div className="px-5 py-5 border-t border-white/10 bg-[#150d09] flex-shrink-0 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#b89070]">Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
              <span className="text-[#f5e6c8] font-extrabold text-xl">${totalPrice.toFixed(2)}</span>
            </div>
            <Link
              href="/cart"
              onClick={closeCart}
              className="flex items-center justify-center gap-2 w-full bg-[#e8a33d] text-[#1a0f0c] font-extrabold py-4 rounded-2xl text-base hover:bg-amber-400 active:scale-[0.98] transition shadow-lg"
            >
              <span>Checkout</span>
              <span className="text-sm opacity-80">→ ${totalPrice.toFixed(2)}</span>
            </Link>
            <Link
              href="/cart"
              onClick={closeCart}
              className="block text-center text-[#b89070] text-sm hover:text-[#e8a33d] transition py-1 font-medium"
            >
              View full cart
            </Link>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </>
  );
}
