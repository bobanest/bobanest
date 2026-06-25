'use client';
import Layout from '@/components/Layout';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useCart } from '@/components/CartContext';

export default function TrackOrder() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const { clearCart } = useCart();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const audioRef = useRef(null);

  const notify = (message) => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed', e));
    }
    setPopupMessage(message);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 5000);
  };

  useEffect(() => {
    if (orderId && !trackingNumber) {
      setLoading(true);
      // First update the order total (in case Stripe webhook hasn't run)
      axios.post('/api/orders/update-after-payment', { orderId })
        .then(() => axios.get(`/api/orders/get-order?id=${orderId}`))
        .then(res => {
          const orderData = res.data;
          setOrder(orderData);
          setTrackingNumber(orderData.trackingNumber);
          clearCart();
          localStorage.removeItem('cart');
          notify(`Order #${orderData.trackingNumber} accepted!`);
        })
        .catch(err => {
          console.error(err);
          setError('Failed to retrieve order. Please contact support.');
        })
        .finally(() => setLoading(false));
    }
  }, [orderId, trackingNumber, clearCart]);

  useEffect(() => {
    if (!trackingNumber) return;
    let lastStatus = order?.status;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/orders/track?tracking=${trackingNumber}`);
        const newOrder = res.data;
        setOrder(newOrder);
        if (lastStatus && newOrder.status !== lastStatus) {
          notify(`Order ${newOrder.trackingNumber} status updated to: ${newOrder.status.toUpperCase()}`);
        }
        lastStatus = newOrder.status;
      } catch (err) {
        // ignore
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [trackingNumber, order?.status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trackingNumber) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/orders/track?tracking=${trackingNumber}`);
      setOrder(res.data);
      setError('');
    } catch {
      setError('Order not found');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const statusSteps = [
    { key: 'pending', label: 'Order Accepted', icon: '✅' },
    { key: 'confirmed', label: 'Preparing', icon: '👨‍🍳' },
    { key: 'preparing', label: 'Packing', icon: '📦' },
    { key: 'ready', label: 'Delivering', icon: '🚚' },
    { key: 'completed', label: 'Delivered', icon: '🏠' },
  ];
  const currentStepIndex = order ? statusSteps.findIndex(s => s.key === order.status) : -1;

  if (loading && !order) {
    return (
      <Layout title="Track Your Order">
        <div className="text-center py-20">Processing your order...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Track Your Order">
      <audio ref={audioRef} src="/ding.mp3" preload="auto" />
      {showPopup && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          🔔 {popupMessage}
        </div>
      )}
      <div className="max-w-3xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Track Your Order</h1>
        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            placeholder="Enter order number (e.g., X7G9K2)"
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value.toUpperCase())}
            className="flex-1 border p-2 rounded"
            required
          />
          <button type="submit" className="btn-primary">Track</button>
        </form>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {order && (
          <div className="bg-white rounded shadow p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Order #{order.trackingNumber}</h2>
              <p className="text-gray-600">
                Placed on {new Date(order.createdAt).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div className="my-4 flex justify-between">
              {statusSteps.map((step, idx) => (
                <div key={step.key} className="text-center flex-1">
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl ${
                    idx <= currentStepIndex ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {idx < currentStepIndex ? '✓' : step.icon}
                  </div>
                  <div className="text-xs mt-1">{step.label}</div>
                </div>
              ))}
            </div>
            <h3 className="font-semibold mt-6">Items:</h3>
            <ul className="list-disc pl-5">
              {order.items.map((item, idx) => (
                <li key={idx}>
                  {item.quantity}x {item.name} - ${item.price.toFixed(2)}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <ul className="list-none pl-4 text-sm text-gray-500">
                      {item.modifiers.map((mod, i) => (
                        <li key={i}>{mod.groupName}: {mod.options.join(', ')}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-4 font-bold">Total: ${order.totalAmount.toFixed(2)}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}