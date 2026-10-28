'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

export default function AdminOnboarding() {
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState('');
  const [invites, setInvites] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await fetch('/api/admin/onboarding-invites');
    if (r.ok) { const d = await r.json(); setInvites(d.invites || []); setEmployees(d.employees || []); }
  }

  useEffect(() => {
    load();
    fetch('/api/locations').then((r) => r.json()).then((d) => {
      const list = (Array.isArray(d) ? d : d.locations || []).filter((l) => l.isActive !== false);
      setLocations(list);
      if (list[0]) setLocation(list[0].slug);
    }).catch(() => {});
  }, []);

  async function create() {
    setMsg('');
    const r = await fetch('/api/admin/onboarding-invites', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg(d.error || 'Failed');
    setLink(`${window.location.origin}/onboarding/${d.token}`);
    load();
  }

  async function revoke(id) {
    if (!confirm('Revoke this invite?')) return;
    await fetch(`/api/admin/onboarding-invites?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function deleteId(id) {
    if (!confirm('Permanently delete the stored ID photo?')) return;
    await fetch(`/api/admin/employee-documents?employeeId=${id}`, { method: 'DELETE' });
    load();
  }

  function copy(t) { navigator.clipboard?.writeText(t); setMsg('Copied'); }

  const status = (i) => (i.usedAt ? 'Used' : new Date(i.expiresAt) < new Date() ? 'Expired' : 'Active');

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <h1 className="text-2xl font-bold">Employee Onboarding</h1>
          {msg && <p className="text-sm text-gray-600">{msg}</p>}

          <section className="bg-white rounded-xl border p-4 space-y-3">
            <h2 className="font-semibold">Create invite link</h2>
            <p className="text-sm text-gray-500">One-time link, valid for 7 days. Send it to the new hire by text or email.</p>
            <div className="flex gap-2">
              <select className="border rounded px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)}>
                {locations.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
              </select>
              <button onClick={create} disabled={!location} className="bg-purple-600 text-white rounded px-4 py-2 disabled:opacity-50">Create link</button>
            </div>
            {link && (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm break-all">
                {link}
                <button onClick={() => copy(link)} className="ml-3 underline text-green-800">Copy</button>
                <p className="text-xs text-gray-500 mt-1">Shown only now. Create a new one if you lose it.</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold mb-2">Invites</h2>
            {!invites.length && <p className="text-sm text-gray-500">No invites yet.</p>}
            {invites.map((i) => (
              <div key={i._id} className="flex justify-between items-center border-t py-2 text-sm">
                <span>{i.locationName} · {status(i)} · expires {new Date(i.expiresAt).toLocaleDateString()}</span>
                {status(i) === 'Active' && <button onClick={() => revoke(i._id)} className="text-red-600">Revoke</button>}
              </div>
            ))}
          </section>

          <section className="bg-white rounded-xl border p-4">
            <h2 className="font-semibold mb-2">Onboarded employees</h2>
            {!employees.length && <p className="text-sm text-gray-500">None yet.</p>}
            {employees.map((e) => (
              <div key={e._id} className="border-t py-2 text-sm flex flex-wrap justify-between gap-2">
                <div>
                  <strong>{e.name}</strong> · ID {e.assignedId}
                  <div className="text-gray-500">{e.email} · {e.phone} · {(e.locations || []).join(', ')}</div>
                </div>
                <div className="flex gap-3 items-center">
                  {e.hasId ? (
                    <>
                      <a className="text-purple-700 underline" target="_blank" rel="noreferrer" href={`/api/admin/employee-documents?employeeId=${e._id}`}>View ID</a>
                      <button onClick={() => deleteId(e._id)} className="text-red-600">Delete ID</button>
                    </>
                  ) : <span className="text-gray-400">No ID</span>}
                  {e.guideToken && <button onClick={() => copy(`${window.location.origin}/staff-guide/${e.guideToken}`)} className="text-purple-700 underline">Copy guide link</button>}
                </div>
              </div>
            ))}
          </section>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
