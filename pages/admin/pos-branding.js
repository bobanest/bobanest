'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

export default function POSBrandingPage() {
  const [logo, setLogo] = useState('/favicon.ico');
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const savedLogo = localStorage.getItem('bobanest-pos-logo');
        if (savedLogo && !cancelled) setLogo(savedLogo);
      } catch (loadError) {
        console.warn('Unable to load saved POS logo', loadError);
      }

      try {
        const response = await fetch('/api/admin/pos-settings');
        const text = await response.text();
        if (!response.ok) throw new Error(`Failed to load POS settings (${response.status})`);
        const settings = text ? JSON.parse(text) : {};
        if (cancelled) return;
        const serverLogo = String(settings.posLogo || '').trim();
        if (!serverLogo) return;
        setLogo(serverLogo);
        localStorage.setItem('bobanest-pos-logo', serverLogo);
      } catch (loadError) {
        if (cancelled) return;
        console.warn('Unable to load POS logo from server', loadError);
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveLogoToServer = async (nextLogo) => {
    const response = await fetch('/api/admin/pos-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'posLogo', value: nextLogo }),
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
    if (!response.ok) throw new Error(body?.error || `Failed to save POS logo (${response.status})`);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSaving(true);
    setError('');
    setMessage('');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = typeof reader.result === 'string' ? reader.result : '/favicon.ico';
        setLogo(result);
        localStorage.setItem('bobanest-pos-logo', result);
        await saveLogoToServer(result);
        setMessage('POS logo updated successfully.');
        setError('');
      } catch (saveError) {
        console.warn('Unable to save POS logo', saveError);
        setError(saveError.message || 'Unable to save the logo.');
      } finally {
        setSaving(false);
      }
    };
    reader.onerror = () => {
      setError('The image could not be processed. Please try another file.');
      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const resetLogo = async () => {
    const defaultLogo = '/favicon.ico';
    setLogo(defaultLogo);
    setFileName('');
    setSaving(true);
    try {
      localStorage.setItem('bobanest-pos-logo', defaultLogo);
      await saveLogoToServer(defaultLogo);
      setMessage('POS logo reset to default.');
      setError('');
    } catch (saveError) {
      console.warn('Unable to reset POS logo', saveError);
      setError(saveError.message || 'Unable to reset the logo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Settings</p>
              <h1 className="text-3xl font-bold text-gray-900 mt-1">POS Logo</h1>
              <p className="text-gray-500 text-sm mt-2">
                Upload the logo used on the Bobanest POS screen. Changes are saved for all devices.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/POS"
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Open POS
              </Link>
              <button
                type="button"
                onClick={resetLogo}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Reset to Default
              </button>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
          ) : null}
          {message ? (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">{message}</div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5 md:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Upload new logo</h2>
              <p className="text-sm text-gray-500 mb-5">
                Use a square image for the best appearance on tablets and register screens.
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Choose image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={saving}
                  className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white file:font-medium hover:file:bg-blue-700"
                />
                {fileName ? <p className="mt-2 text-xs text-gray-500">Selected file: {fileName}</p> : null}
              </div>

              <div className="mt-5 rounded-lg bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500 mb-2">Tips</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                  <li>Use a transparent PNG for the cleanest look.</li>
                  <li>Keep the logo centered with some padding.</li>
                  <li>Refresh the POS screen after changing the image.</li>
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-100 p-5 md:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Preview</h2>
              <div className="rounded-xl border border-gray-200 bg-gray-50 min-h-[280px] flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="mx-auto w-24 h-24 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex items-center justify-center">
                    <img src={logo} alt="POS logo preview" className="w-full h-full object-contain" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mt-4">Bobanest POS</p>
                  <p className="text-xs text-gray-500 mt-1">Current logo preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
