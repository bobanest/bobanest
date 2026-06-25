import '@/styles/globals.css';
import { CartProvider } from '@/components/CartContext';
import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function subscribeToPush(registration) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) return;
  try {
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });
  } catch (err) {
    console.error('Push subscribe error:', err);
  }
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      const permission = Notification.permission;
      if (permission === 'granted') {
        await subscribeToPush(registration);
      } else if (permission === 'default') {
        // Ask once, non-intrusively — only after a short delay
        setTimeout(async () => {
          const result = await Notification.requestPermission();
          if (result === 'granted') {
            await subscribeToPush(registration);
          }
        }, 5000);
      }
    }).catch(console.error);
  }, []);

  return (
    <SessionProvider session={session}>
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </SessionProvider>
  );
}