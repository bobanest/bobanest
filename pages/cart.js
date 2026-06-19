import Layout from '@/components/Layout';
import { useCart } from '@/components/CartContext';
import Link from 'next/link';

// Add at top of file:
import { loadStripe } from '@stripe/stripe-js';
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Replace the checkout button handler:
const handleCheckout = async () => {
  const stripe = await stripePromise;
  const response = await fetch('/api/cart/checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: cart.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })) }),
  });
  const session = await response.json();
  await stripe.redirectToCheckout({ sessionId: session.id });
};

// In the summary section, ensure button onClick={handleCheckout}

export default function CartPage() {
  const { cart = [], removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();

  if (cart.length === 0) {
    return (
      <Layout title="Your Cart">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
          <Link href="/products" className="btn-primary">Browse Menu</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Your Cart">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {cart.map(item => (
              <div key={item.id} className="flex gap-4 border-b py-4">
                <img src={item.imageUrl || item.image} alt={item.name} className="w-24 h-24 object-cover rounded" />
                <div className="flex-grow">
                  <h3 className="font-bold">{item.name}</h3>
                  <p className="text-primary">${item.price}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 py-1 bg-gray-200 rounded">-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 py-1 bg-gray-200 rounded">+</button>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 ml-4">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 p-6 rounded-lg h-fit">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Tax (7%)</span>
              <span>${(totalPrice * 0.07).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t">
              <span>Total</span>
              <span>${(totalPrice * 1.07).toFixed(2)}</span>
            </div>
            <button className="btn-primary w-full mt-6" onClick={handleCheckout}>Checkout</button>
            <button onClick={clearCart} className="text-gray-500 text-sm mt-4 w-full text-center">Clear Cart</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}