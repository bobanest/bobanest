import Layout from '@/components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function QrOrderPage() {
  const router = useRouter();
  const { id, loc } = router.query;
  const [product, setProduct] = useState(null);
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState('');
  const [walletReady, setWalletReady] = useState(true);
  const mountRef = useRef(null);

  useEffect(() => {
    if (!router.isReady || !id) return;
    Promise.all([
      axios.get(`/api/admin/products?id=${id}`),
      axios.get('/api/locations'),
    ])
      .then(([p, l]) => {
        const item = Array.isArray(p.data) ? p.data[0] : p.data;
        if (!item || item.inStock === false) return setStatus('unavailable');
        const open = (l.data || []).filter((x) => x.isActive !== false && !x.isComingSoon);
        setProduct(item);
        setLocations(open);
        const wanted = open.find((x) => x.slug === loc || x.name === loc);
        setLocation((wanted || open[0])?.name || '');
        setStatus('ready');
      })
      .catch(() => setStatus('unavailable'));
  }, [router.isReady, id, loc]);

  const amountCents = product ? Math.round(Number(product.price) * 100) * quantity : 0;

  useEffect(() => {
    if (status !== 'ready' || !mountRef.current || !amountCents || !location) return;
    let expressElement;
    let cancelled = false;

    (async () => {
      const stripe = await stripePromise;
      if (!stripe || cancelled) return;
      const elements = stripe.elements({
        mode: 'payment',
        amount: amountCents,
        currency: 'usd',
        paymentMethodTypes: ['card'],
      });
      expressElement = elements.create('expressCheckout', {
        buttonHeight: 52,
        paymentMethods: { applePay: 'always', googlePay: 'always', link: 'never', paypal: 'never', amazonPay: 'never' },
        emailRequired: true,
        phoneNumberRequired: true,
      });
      expressElement.mount(mountRef.current);
      expressElement.on('ready', ({ availablePaymentMethods }) => {
        setWalletReady(Boolean(availablePaymentMethods));
      });
      expressElement.on('confirm', async (event) => {
        setError('');
        setStatus('paying');
        try {
          const { error: submitError } = await elements.submit();
          if (submitError) throw new Error(submitError.message);
          const { data } = await axios.post('/api/qr/intent', {
            productId: id,
            quantity,
            pickupLocation: location,
            name: event.billingDetails?.name,
            email: event.billingDetails?.email,
            phone: event.billingDetails?.phone,
          });
          const result = await stripe.confirmPayment({
            elements,
            clientSecret: data.clientSecret,
            redirect: 'if_required',
            confirmParams: { return_url: window.location.href },
          });
          if (result.error) throw new Error(result.error.message);
          const done = await axios.post('/api/qr/finalize', { paymentIntentId: result.paymentIntent.id });
          setTracking(done.data.trackingNumber);
          setStatus('done');
        } catch (e) {
          setError(e.response?.data?.error || e.message || 'Payment failed. Please try again.');
          setStatus('ready');
        }
      });
    })();

    return () => {
      cancelled = true;
      try { expressElement?.destroy(); } catch {}
    };
  }, [status === 'ready', amountCents, location, id, quantity]);

  return (
    <Layout title="Order with Apple Pay / Google Pay">
      <div className="max-w-md mx-auto px-4 py-8">
        {status === 'loading' && <p className="text-center text-gray-500">Loading…</p>}
        {status === 'unavailable' && (
          <div className="text-center">
            <p className="text-lg mb-4">Sorry, this item is not available right now.</p>
            <Link href="/menu" className="underline">View our menu</Link>
          </div>
        )}
        {status === 'done' && (
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold">Thank you! 🎉</h1>
            <p>Your order is paid and being prepared.</p>
            <p className="text-lg">Order #: <strong>{tracking}</strong></p>
            <p className="text-sm text-gray-500">Pickup: {location}</p>
            <Link href="/track-order" className="underline">Track your order</Link>
          </div>
        )}
        {(status === 'ready' || status === 'paying') && product && (
          <div className="space-y-5">
            {product.imageUrl && (
              <img src={product.imageUrl} alt={product.name} className="w-full max-h-80 object-contain rounded-xl" />
            )}
            <div className="text-center">
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <p className="text-xl mt-1">${Number(product.price).toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button type="button" className="w-11 h-11 rounded-full border text-xl" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span className="text-xl w-8 text-center">{quantity}</span>
              <button type="button" className="w-11 h-11 rounded-full border text-xl" onClick={() => setQuantity((q) => Math.min(10, q + 1))} aria-label="Increase quantity">+</button>
            </div>
            {locations.length > 1 && (
              <label className="block text-sm">
                Pickup location
                <select value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full border rounded p-2">
                  {locations.map((l) => <option key={l.slug || l.name} value={l.name}>{l.name}</option>)}
                </select>
              </label>
            )}
            {locations.length === 1 && <p className="text-sm text-center text-gray-600">Pickup: {location}</p>}
            <p className="text-center font-semibold">Total: ${(amountCents / 100).toFixed(2)}</p>
            <div ref={mountRef} className={status === 'paying' ? 'opacity-50 pointer-events-none' : ''} />
            {!walletReady && (
              <p className="text-sm text-center text-gray-500">
                Apple Pay or Google Pay isn’t available on this device. Please use Safari with Apple Pay set up, or Chrome with Google Pay.
              </p>
            )}
            {status === 'paying' && <p className="text-center text-gray-500">Processing payment…</p>}
            {error && <p className="text-center text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </Layout>
  );
}
