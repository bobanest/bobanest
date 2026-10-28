import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import GuideBody from '@/components/GuideBody';

export default function StaffGuide() {
  const { query } = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState('');

  useEffect(() => {
    if (!query.token) return;
    fetch(`/api/guides/${encodeURIComponent(query.token)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Link not found.');
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [query.token]);

  const groups = {};
  (data?.guides || []).forEach((g) => { (groups[g.category] = groups[g.category] || []).push(g); });

  return (
    <div className="min-h-screen bg-gray-50">
      <Head><title>Staff guide</title><meta name="robots" content="noindex,nofollow" /></Head>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {error && <p className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</p>}
        {!data && !error && <p className="text-gray-500">Loading…</p>}
        {data && (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Hi {data.firstName}, welcome aboard!</h1>
            <p className="text-gray-600 mt-1">Your staff guide{data.stores.length ? ` for ${data.stores.join(' & ')}` : ''}. Bookmark this page.</p>
            <p className="text-xs text-gray-500 mt-1">For team members only. Please do not share this link.</p>
            {Object.keys(groups).map((cat) => (
              <div key={cat} className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">{cat}</h2>
                <div className="space-y-2">
                  {groups[cat].map((g) => (
                    <div key={g._id} className="bg-white rounded-xl border border-gray-200">
                      <button className="w-full text-left px-4 py-3 font-medium text-gray-900 flex justify-between" onClick={() => setOpen(open === g._id ? '' : g._id)}>
                        {g.title}<span className="text-gray-400">{open === g._id ? '−' : '+'}</span>
                      </button>
                      {open === g._id && <div className="px-4 pb-4 border-t border-gray-100"><GuideBody text={g.body} /></div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!data.guides.length && <p className="mt-6 text-gray-600">Your manager has not added guides yet.</p>}
          </>
        )}
      </div>
    </div>
  );
}
