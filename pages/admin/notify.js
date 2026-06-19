'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect, useRef, useCallback } from 'react';

export default function NotifyPage() {
  const [orders, setOrders] = useState([]);
  const [acknowledged, setAcknowledged] = useState(() => {
    if (typeof window !== 'undefined') {
      try { return new Set(JSON.parse(localStorage.getItem('bobanest_ack_orders') || '[]')); }
      catch { return new Set(); }
    }
    return new Set();
  });
  const [monitoring, setMonitoring] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  const [lastPoll, setLastPoll] = useState(null);
  const audioCtxRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Orders from the last 24 hours that are paid and not acknowledged
  const newOrders = orders.filter(
    o => o.paymentStatus === 'paid' && o.status !== 'cancelled' && !acknowledged.has(o._id)
  );

  // --- Audio ---
  const playBeep = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    // Three quick beeps
    [0, 0.25, 0.5].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'square';
      gain.gain.setValueAtTime(0, ctx.currentTime + offset);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.22);
    });
  }, []);

  const startAlarm = useCallback(() => {
    if (alarmIntervalRef.current) return;
    playBeep();
    alarmIntervalRef.current = setInterval(playBeep, 1500);
    setAlarmActive(true);
  }, [playBeep]);

  const stopAlarm = useCallback(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    setAlarmActive(false);
  }, []);

  // --- Polling ---
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        const since = Date.now() - 24 * 60 * 60 * 1000;
        setOrders(data.filter(o => new Date(o.createdAt) > since));
        setLastPoll(new Date());
      }
    } catch {}
  }, []);

  const startMonitoring = () => {
    // Must be triggered by user gesture to unlock audio on iOS
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    setMonitoring(true);
    fetchOrders();
    pollIntervalRef.current = setInterval(fetchOrders, 5000);
    // Request full screen (works on Android/desktop; iOS needs "Add to Home Screen")
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      stopAlarm();
    };
  }, [stopAlarm]);

  // Trigger alarm when new orders appear
  useEffect(() => {
    if (!monitoring) return;
    if (newOrders.length > 0) {
      startAlarm();
    } else {
      stopAlarm();
    }
  }, [newOrders.length, monitoring, startAlarm, stopAlarm]);

  // --- Acknowledge ---
  const acknowledge = (id) => {
    setAcknowledged(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('bobanest_ack_orders', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const acknowledgeAll = () => {
    setAcknowledged(prev => {
      const next = new Set(prev);
      newOrders.forEach(o => next.add(o._id));
      try { localStorage.setItem('bobanest_ack_orders', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <ProtectedRoute>
      <div
        className="min-h-screen w-full transition-colors duration-500"
        style={{ backgroundColor: alarmActive ? '#dc2626' : monitoring ? '#16a34a' : '#1e293b' }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-black bg-opacity-30">
          <div className="flex items-center gap-3">
            <span className="text-white text-2xl font-bold">🧋 BobaNest Orders</span>
            {monitoring && (
              <span className="flex items-center gap-1.5 text-white text-sm opacity-80">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: alarmActive ? '#fbbf24' : '#4ade80',
                    animation: 'pulse 1s infinite',
                  }}
                />
                {alarmActive ? 'NEW ORDER!' : 'Monitoring'}
                {lastPoll && <span className="text-xs opacity-60 ml-1">· {timeAgo(lastPoll)}</span>}
              </span>
            )}
          </div>
          {monitoring && newOrders.length > 0 && (
            <button
              onClick={acknowledgeAll}
              className="bg-white text-red-600 font-bold px-4 py-2 rounded-lg text-sm shadow-lg"
            >
              Acknowledge All ({newOrders.length})
            </button>
          )}
        </div>

        {/* Start screen */}
        {!monitoring && (
          <div className="flex flex-col items-center justify-center min-h-screen gap-6 -mt-12">
            <div className="text-white text-center">
              <p className="text-6xl mb-4">🔔</p>
              <h1 className="text-3xl font-bold mb-2">Order Notifications</h1>
              <p className="text-white opacity-75 text-lg">Tap to start monitoring for new orders</p>
              <p className="text-white opacity-50 text-sm mt-1">Keep this page open on your iPad</p>
            </div>
            <button
              onClick={startMonitoring}
              className="bg-white text-gray-900 font-bold text-2xl px-12 py-6 rounded-2xl shadow-2xl active:scale-95 transition-transform"
            >
              Start Monitoring
            </button>
          </div>
        )}

        {/* All clear */}
        {monitoring && newOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-screen gap-4 -mt-12">
            <p className="text-8xl">✅</p>
            <h2 className="text-white text-4xl font-bold">All Clear</h2>
            <p className="text-white opacity-75 text-lg">No new orders · Checking every 5 seconds</p>
          </div>
        )}

        {/* New order alerts */}
        {monitoring && newOrders.length > 0 && (
          <div className="p-4 space-y-4 max-w-2xl mx-auto pt-4">
            {newOrders.map(order => (
              <div
                key={order._id}
                className="bg-white rounded-2xl shadow-2xl overflow-hidden"
                style={{ animation: 'slideIn 0.3s ease-out' }}
              >
                {/* Order header */}
                <div className="bg-red-600 px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-xl">NEW ORDER #{order.trackingNumber}</p>
                    <p className="text-red-100 text-sm">{timeAgo(order.createdAt)}</p>
                  </div>
                  <span className="bg-white text-red-600 font-bold px-3 py-1 rounded-full text-sm uppercase">
                    {order.orderType}
                  </span>
                </div>

                {/* Customer info */}
                <div className="px-5 py-3 border-b bg-gray-50">
                  <p className="font-bold text-lg text-gray-900">{order.customerName || 'Guest'}</p>
                  {order.customerPhone && (
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="text-blue-600 font-bold text-lg flex items-center gap-2 mt-0.5"
                    >
                      📞 {order.customerPhone}
                    </a>
                  )}
                  {order.customerEmail && (
                    <p className="text-gray-500 text-sm">{order.customerEmail}</p>
                  )}
                  {order.orderType === 'delivery' && order.deliveryAddress && (
                    <p className="text-gray-600 text-sm mt-1">📍 {order.deliveryAddress}</p>
                  )}
                  {order.scheduledTime && (
                    <p className="text-orange-600 font-semibold text-sm mt-1">
                      ⏰ Scheduled: {new Date(order.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {/* Items */}
                <div className="px-5 py-3 border-b">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Items</p>
                  {(order.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between items-start py-1">
                      <div>
                        <span className="font-semibold text-gray-900">{item.quantity}× {item.name}</span>
                        {item.modifiers?.length > 0 && (
                          <p className="text-xs text-gray-500">
                            {item.modifiers.map(m => `${m.groupName}: ${m.options.join(', ')}`).join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className="text-gray-600 text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Total + Acknowledge */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <p className="text-2xl font-bold text-gray-900">
                    Total: ${order.totalAmount?.toFixed(2)}
                  </p>
                  <button
                    onClick={() => acknowledge(order._id)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-3 rounded-xl shadow active:scale-95 transition-transform"
                  >
                    ✓ Got It
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent acknowledged orders (collapsed) */}
        {monitoring && (
          <div className="max-w-2xl mx-auto px-4 pb-8 mt-4">
            <details className="text-white opacity-60">
              <summary className="cursor-pointer text-sm select-none">
                {orders.length - newOrders.length} acknowledged orders (last 24h)
              </summary>
              <div className="mt-2 space-y-1">
                {orders.filter(o => acknowledged.has(o._id)).map(o => (
                  <div key={o._id} className="text-xs bg-black bg-opacity-20 rounded px-3 py-1.5 flex justify-between">
                    <span>#{o.trackingNumber} · {o.customerName} · {(o.items||[]).length} items</span>
                    <span>${o.totalAmount?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        <style jsx>{`
          @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
