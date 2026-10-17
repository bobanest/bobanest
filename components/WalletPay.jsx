import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Apple Pay / Google Pay button for a cart (or a single customized item). Prices are always computed on the server.
export default function WalletPay({ items, pickupLocation, onSuccess, buttonHeight = 48 }) {
  const mountRef = useRef(null);
  const latest = useRef({});
  const [amount, setAmount] = useState(null);
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const itemsKey = JSON.stringify(items);
  latest.current = { items, pickupLocation, amount, onSuccess };

  useEffect(() => {
    setAmount(null);
    setError('');
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.post('/api/qr/quote', { items, pickupLocation });
        if (!cancelled) setAmount(data.amount);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || '');
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [itemsKey, pickupLocation]);

  useEffect(() => {
    if (!amount || !mountRef.current) return;
    let element;
    let cancelled = false;

    (async () => {
      const stripe = await stripePromise;
      if (!stripe || cancelled) return;
      const elements = stripe.elements({
        mode: 'payment',
        amount,
        currency: 'usd',
        paymentMethodTypes: ['card'],
      });
      element = elements.create('expressCheckout', {
        buttonHeight,
        paymentMethods: { applePay: 'always', googlePay: 'always', link: 'never', paypal: 'never', amazonPay: 'never' },
        emailRequired: true,
        phoneNumberRequired: true,
      });
      element.mount(mountRef.current);
      element.on('ready', ({ availablePaymentMethods }) => setAvailable(Boolean(availablePaymentMethods)));
      element.on('confirm', async (event) => {
        setError('');
        setBusy(true);
        try {
          const { error: submitError } = await elements.submit();
          if (submitError) throw new Error(submitError.message);
          const cur = latest.current;
          const { data } = await axios.post('/api/qr/intent', {
            items: cur.items,
            pickupLocation: cur.pickupLocation,
            expectedAmount: cur.amount,
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
          cur.onSuccess?.({ trackingNumber: done.data.trackingNumber, email: event.billingDetails?.email });
        } catch (e) {
          setError(e.response?.data?.error || e.message || 'Payment failed. Please try again.');
        } finally {
          setBusy(false);
        }
      });
    })();

    return () => {
      cancelled = true;
      try { element?.destroy(); } catch {}
    };
  }, [amount, buttonHeight]);

  return (
    <div>
      <div
        ref={mountRef}
        style={{
          ...(available && amount ? {} : { height: 0, overflow: 'hidden' }),
          opacity: busy ? 0.5 : 1,
          pointerEvents: busy ? 'none' : 'auto',
        }}
      />
      {busy && <p className="text-xs text-center opacity-70 mt-1">Processing payment…</p>}
      {error && <p className="text-xs text-center text-red-500 mt-1">{error}</p>}
    </div>
  );
}
