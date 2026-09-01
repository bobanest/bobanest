'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

export default function POSSecurityPage() {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [currentPasscodeSet, setCurrentPasscodeSet] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/pos-settings');
        const text = await response.text();
        if (!response.ok) throw new Error(`Failed to load settings (${response.status})`);
        const data = text ? JSON.parse(text) : {};
        if (cancelled) return;
        setCurrentPasscodeSet(Boolean(String(data.fullscreenPasscode || '').trim()));
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError.message || 'Unable to load POS passcode settings.');
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const savePasscode = async () => {
    setError('');
    setMessage('');

    if (passcode !== confirmPasscode) {
      setError('Passcode and confirm passcode must match.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/pos-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'fullscreenPasscode',
          value: String(passcode || '').trim(),
        }),
      });

      const text = await response.text();
      let body = {};
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = {};
        }
      }
      if (!response.ok) throw new Error(body?.error || `Failed to save passcode (${response.status})`);

      setCurrentPasscodeSet(Boolean(String(passcode || '').trim()));
      setPasscode('');
      setConfirmPasscode('');
      setMessage('POS fullscreen passcode saved.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save POS passcode.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-3xl mx-auto p-4 md:p-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Settings</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">POS Passcode</h1>
            <p className="text-gray-500 text-sm mt-2">
              Set a passcode to prevent exiting POS full screen mode without authorization.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
          ) : null}
          {message ? (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">{message}</div>
          ) : null}

          <div className="bg-white rounded-xl shadow border border-gray-100 p-5 md:p-6 space-y-4">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
              Current status: <span className="font-semibold">{currentPasscodeSet ? 'Passcode set' : 'No passcode set'}</span>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New passcode</label>
              <input
                type="password"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                placeholder="Enter passcode"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm passcode</label>
              <input
                type="password"
                value={confirmPasscode}
                onChange={(event) => setConfirmPasscode(event.target.value)}
                placeholder="Confirm passcode"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
              />
            </div>

            <button
              type="button"
              onClick={savePasscode}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save POS Passcode'}
            </button>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
