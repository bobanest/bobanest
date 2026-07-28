import Navbar from './Navbar';
import Footer from './Footer';
import FacebookPixel from './FacebookPixel';
import LiveScoreTicker from './LiveScoreTicker';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Layout({ children, title = 'Bobanest – Best Bubble Tea', dark = false }) {
  const [fbSettings, setFbSettings] = useState({ pixelId: '', enabled: false });
  const router = useRouter();
  const isHomePage = router.pathname === '/';
  const isAdminRoute = router.pathname.startsWith('/admin');
  const isEmployeeRoute = router.pathname.startsWith('/employee');
  const useDarkTheme = dark || (!isAdminRoute && !isEmployeeRoute);

  useEffect(() => {
    // Load Facebook tracking settings
    fetch('/api/admin/facebook-tracking')
      .then(res => res.json())
      .then(data => setFbSettings(data))
      .catch(() => {}); // Fail silently
  }, []);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Fresh bubble tea in Zephyrhills. Order online for pickup." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <FacebookPixel pixelId={fbSettings.pixelId} enabled={fbSettings.enabled} />
      <div className={`flex flex-col min-h-screen ${useDarkTheme ? 'bg-[#1a0f0c]' : ''}`}>
        {isHomePage && <LiveScoreTicker />}
        <Navbar dark={useDarkTheme} />
        <main className="flex-grow">{children}</main>
        <Footer dark={useDarkTheme} />
      </div>
    </>
  );
}