import '@/styles/globals.css';
import { CartProvider } from '@/components/CartContext';
import { SessionProvider } from 'next-auth/react';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { useEffect } from 'react';

const GA_MEASUREMENT_ID = 'G-3TE06C5MK5';

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
  const router = useRouter();

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

  useEffect(() => {
    const handleRouteChange = (url) => {
      if (!window.gtag) return;
      window.gtag('config', GA_MEASUREMENT_ID, { page_path: url });
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <SessionProvider session={session}>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </SessionProvider>
  );
}