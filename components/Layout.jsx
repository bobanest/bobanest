import Navbar from './Navbar';
import Footer from './Footer';
import Head from 'next/head';

export default function Layout({ children, title = 'Bobanest – Best Bubble Tea' }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Fresh bubble tea in Zephyrhills. Order online for pickup." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    </>
  );
}