import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// Shrinks the photo in the browser so it stays well under the upload limit.
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !file.type.startsWith('image/')) return reject(new Error('Please choose a photo.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let q = 0.82;
      let out = c.toDataURL('image/jpeg', q);
      while (out.length > 1.4 * 1024 * 1024 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that photo. Please use a JPG or PNG.')); };
    img.src = url;
  });
}

export default function Onboarding() {
  const { query } = useRouter();
  const [store, setStore] = useState('');
  const [invalid, setInvalid] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [idImage, setIdImage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!query.token) return;
    fetch(`/api/onboarding/submit?token=${encodeURIComponent(query.token)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Invalid link.');
        setStore(d.locationName);
      })
      .catch((e) => setInvalid(e.message));
  }, [query.token]);

  async function pick(e) {
    setError('');
    const f = e.target.files?.[0];
    if (!f) return;
    try { setIdImage(await shrinkImage(f)); } catch (err) { setIdImage(''); setError(err.message); }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!idImage) return setError('Please upload a photo of your government ID.');
    setBusy(true);
    try {
      const r = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: query.token, ...form, idImage }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Something went wrong.');
      setDone(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-purple-500';

  return (
    <div className="min-h-screen bg-gray-50">
      <Head><title>Team onboarding</title><meta name="robots" content="noindex,nofollow" /></Head>
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Join the team</h1>
        {invalid && <p className="mt-4 bg-red-50 text-red-700 p-4 rounded-lg">{invalid}</p>}

        {!invalid && !done && (
          <form onSubmit={submit} className="mt-4 bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            {store && <p className="text-gray-600">Store: <strong>{store}</strong></p>}
            <label className="block"><span className="text-sm font-medium text-gray-700">Full name</span>
              <input className={input} required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>
            <label className="block"><span className="text-sm font-medium text-gray-700">Email</span>
              <input className={input} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label>
            <label className="block"><span className="text-sm font-medium text-gray-700">Phone number</span>
              <input className={input} type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></label>
            <div>
              <span className="text-sm font-medium text-gray-700">Government ID photo</span>
              <input className="block w-full text-sm mt-1" type="file" accept="image/*" onChange={pick} />
              <p className="text-xs text-gray-500 mt-1">Take a clear photo of the front of your ID. It is kept private and only the owner can see it.</p>
              {idImage && <img src={idImage} alt="ID preview" className="mt-2 max-h-40 rounded-lg border" />}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button disabled={busy || !store} className="w-full bg-purple-600 text-white font-semibold rounded-lg py-3 disabled:opacity-50">
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        )}

        {done && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-lg font-semibold text-green-700">You are all set!</p>
            <p className="text-gray-700 mt-2">Your employee ID is <strong>{done.assignedId}</strong>. You will use it to clock in and out.</p>
            <p className="text-gray-700 mt-2">Next, read your training guide:</p>
            <Link href={`/staff-guide/${done.guideToken}`} className="mt-3 inline-block bg-purple-600 text-white font-semibold rounded-lg px-5 py-3">Open my staff guide</Link>
            <p className="text-xs text-gray-500 mt-3">Bookmark the guide page. Please do not share the link.</p>
          </div>
        )}
      </div>
    </div>
  );
}
