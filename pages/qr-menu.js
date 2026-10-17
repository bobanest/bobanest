import Layout from '@/components/Layout';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import QRCode from 'qrcode';

const SITE = 'https://www.bobanest.com';

export default function QrMenu() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [qrs, setQrs] = useState({});
  const loc = typeof router.query.loc === 'string' ? router.query.loc : '';

  useEffect(() => {
    axios.get('/api/admin/products').then((r) => setProducts((r.data || []).filter((p) => p.inStock !== false)));
    axios.get('/api/locations').then((r) => setLocations((r.data || []).filter((l) => l.isActive !== false && !l.isComingSoon)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = {};
      for (const p of products) {
        const url = `${SITE}/order/${p._id}${loc ? `?loc=${encodeURIComponent(loc)}` : ''}`;
        next[p._id] = await QRCode.toDataURL(url, { width: 400, margin: 1 });
      }
      if (!cancelled) setQrs(next);
    })();
    return () => { cancelled = true; };
  }, [products, loc]);

  const categories = [...new Set(products.map((p) => p.category || 'Menu'))];

  return (
    <Layout title="QR Menu">
      <style>{`@media print { header, footer, nav, .no-print { display: none !important; } .qr-card { break-inside: avoid; } }`}</style>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-2">Scan to Order</h1>
        <p className="text-center text-gray-600 mb-4">Scan a drink’s QR code and pay with Apple Pay or Google Pay.</p>
        <div className="no-print flex flex-wrap items-center justify-center gap-3 mb-8">
          {locations.length > 1 && (
            <select value={loc} onChange={(e) => router.replace({ query: e.target.value ? { loc: e.target.value } : {} })} className="border rounded p-2">
              <option value="">Default location</option>
              {locations.map((l) => <option key={l.slug || l.name} value={l.slug || l.name}>{l.name}</option>)}
            </select>
          )}
          <button type="button" onClick={() => window.print()} className="px-4 py-2 border rounded">Print</button>
        </div>
        {categories.map((cat) => (
          <section key={cat} className="mb-10">
            <h2 className="text-xl font-semibold mb-4">{cat}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.filter((p) => (p.category || 'Menu') === cat).map((p) => (
                <div key={p._id} className="qr-card border rounded-xl p-3 text-center">
                  {(p.cupImageUrl || p.imageUrl) && (
                    <img src={p.cupImageUrl || p.imageUrl} alt={p.name} className="h-32 mx-auto object-contain" />
                  )}
                  <div className="font-semibold mt-2">{p.name}</div>
                  <div className="text-sm text-gray-600">${Number(p.price).toFixed(2)}</div>
                  {qrs[p._id] && <img src={qrs[p._id]} alt={`QR code for ${p.name}`} className="w-36 h-36 mx-auto mt-2" />}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Layout>
  );
}
