'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { trackAddToCart } from '@/lib/facebookTracking';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [promotionsLoaded, setPromotionsLoaded] = useState(false);

  // Fetch promotions once at startup
  useEffect(() => {
    fetch('/api/admin/promotions?active=true')
      .then(async (res) => {
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok) {
          throw new Error(`Promotions request failed (${res.status})`);
        }
        if (!contentType.includes('application/json')) {
          throw new Error('Promotions API did not return JSON');
        }
        return res.json();
      })
      .then(data => {
        setPromotions(Array.isArray(data) ? data : []);
        setPromotionsLoaded(true);
      })
      .catch(err => {
        console.error('Failed to fetch promotions', err);
        setPromotions([]);
        setPromotionsLoaded(true);
      });
  }, []);

  // Helper: check if a product has an active BOGO promotion
  const hasBogoPromotion = (productId) => {
    for (const promo of promotions) {
      if (promo.type !== 'bogo') continue;
      if (!promo.isActive) continue;
      // Date validation
      const now = new Date();
      if (promo.startDate && new Date(promo.startDate) > now) continue;
      if (promo.endDate && new Date(promo.endDate) < now) continue;
      const applicableProductIds = (promo.applicableProducts || []).map(p => p._id || p);
      if (applicableProductIds.length === 0 || applicableProductIds.includes(productId)) {
        return true;
      }
    }
    return false;
  };

  // Retroactively apply BOGO qty=2 to any existing cart items once promotions load
  useEffect(() => {
    if (!promotionsLoaded) return;
    const now = new Date();
    setCartItems(prev => {
      let changed = false;
      const updated = prev.map(item => {
        const isBogo = promotions.some(promo => {
          if (promo.type !== 'bogo' || !promo.isActive) return false;
          if (promo.startDate && new Date(promo.startDate) > now) return false;
          if (promo.endDate && new Date(promo.endDate) < now) return false;
          const ids = (promo.applicableProducts || []).map(p => p._id || p);
          return ids.length === 0 || ids.includes(item.id);
        });
        if (isBogo && item.quantity === 1) {
          changed = true;
          return { ...item, quantity: 2 };
        }
        return item;
      });
      return changed ? updated : prev;
    });
  }, [promotionsLoaded, promotions]);

  const addToCart = (product) => {
    setCartItems(prev => {
      // Use _id for consistency
      const productId = product._id || product.id;
      const existingIndex = prev.findIndex(item =>
        (item._id || item.id) === productId &&
        JSON.stringify(item.modifiers) === JSON.stringify(product.modifiers)
      );

      const isBogo = hasBogoPromotion(productId);
      const newQuantity = product.quantity || 1;

      if (isBogo) {
        // BOGO: Always add a free item line for every paid item
        const paidPrice = product.finalPrice !== undefined ? product.finalPrice : product.price;
        const modifiersKey = JSON.stringify(product.modifiers || []);
        // Find existing paid and free lines
        const paidIndex = prev.findIndex(item => (item._id || item.id) === productId && JSON.stringify(item.modifiers) === modifiersKey && !item.isFreeBogo);
        const freeIndex = prev.findIndex(item => (item._id || item.id) === productId && JSON.stringify(item.modifiers) === modifiersKey && item.isFreeBogo);

        let updated = [...prev];
        // Add paid item
        if (paidIndex !== -1) {
          updated[paidIndex] = { ...updated[paidIndex], quantity: updated[paidIndex].quantity + newQuantity };
        } else {
          updated.push({
            _id: productId,
            id: productId,
            name: product.name,
            price: paidPrice,
            imageUrl: product.imageUrl,
            quantity: newQuantity,
            modifiers: product.modifiers || [],
          });
        }
        // Add/update free BOGO item line
        const paidQty = (paidIndex !== -1 ? updated[paidIndex].quantity : newQuantity);
        const freeQty = paidQty; // 1 free per 1 paid (BOGO)
        if (freeIndex !== -1) {
          updated[freeIndex] = {
            ...updated[freeIndex],
            quantity: freeQty,
            price: 0,
          };
        } else {
          updated.push({
            _id: productId,
            id: productId,
            name: product.name + ' (BOGO Free)',
            price: 0,
            imageUrl: product.imageUrl,
            quantity: freeQty,
            modifiers: product.modifiers || [],
            isFreeBogo: true,
          });
        }
        return updated;
      } else {
        // Normal product
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex].quantity += newQuantity;
          return updated;
        }
        return [...prev, {
          id: product.id,
          name: product.name,
          price: product.finalPrice !== undefined ? product.finalPrice : product.price,
          imageUrl: product.imageUrl,
          quantity: newQuantity,
          modifiers: product.modifiers || [],
        }];
      }
    });

    // Track Facebook AddToCart event
    trackAddToCart(product, product.quantity || 1);
  };

  const removeFromCart = (productId, modifiers = null) => {
    if (modifiers) {
      setCartItems(prev => prev.filter(item =>
        !(item.id === productId && JSON.stringify(item.modifiers) === JSON.stringify(modifiers))
      ));
    } else {
      setCartItems(prev => prev.filter(item => item.id !== productId));
    }
  };

  const updateQuantity = (productId, quantity, modifiers = null) => {
    if (quantity <= 0) {
      removeFromCart(productId, modifiers);
      return;
    }
    setCartItems(prev =>
      prev.map(item => {
        if (item.id === productId && (!modifiers || JSON.stringify(item.modifiers) === JSON.stringify(modifiers))) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
  };

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCartItems(JSON.parse(savedCart));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      totalItems,
      totalPrice,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    return {
      cartItems: [],
      totalItems: 0,
      totalPrice: 0,
      addToCart: () => {},
      removeFromCart: () => {},
      updateQuantity: () => {},
      clearCart: () => {},
    };
  }
  return context;
}