'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';

const DEFAULT_SETTINGS = {
  mode: 'browser',
  printerName: '',
  ipAddress: '',
  printCopies: 1,
};

const DEFAULT_NETWORK_PREFIX = '192.168.1.';
const QUICK_IP_SUFFIXES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 150, 200];

function normalizePrinterList(list) {
  const seen = new Set();
  return list.filter((printer) => {
    const key = `${printer.type}:${printer.name}:${printer.ip || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseNetworkPrefix(address) {
  const value = String(address || '').trim();
  const parts = value.split('.');
  if (parts.length < 3) return DEFAULT_NETWORK_PREFIX;
  const a = parts[0];
  const b = parts[1];
  const c = parts[2];
  if (!a || !b || !c) return DEFAULT_NETWORK_PREFIX;
  return `${a}.${b}.${c}.`;
}

function buildNetworkCandidates(prefix, deepScan) {
  if (deepScan) {
    return Array.from({ length: 254 }, (_, index) => `${prefix}${index + 1}`);
  }
  return QUICK_IP_SUFFIXES.map((suffix) => `${prefix}${suffix}`);
}

async function probePrinterAddress(ip) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    await fetch(`http://${ip}:9100`, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return {
      id: `net-${ip}`,
      name: `Network Printer ${ip}`,
      ip,
      type: 'network',
    };
  } catch {
    return null;
  }
}

export default function PrinterSetupPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [searching, setSearching] = useState(false);
  const [networkPrefix, setNetworkPrefix] = useState(DEFAULT_NETWORK_PREFIX);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const saved = localStorage.getItem('bobanest-pos-printer');
        if (saved) {
          const parsed = JSON.parse(saved);
          const next = { ...DEFAULT_SETTINGS, ...parsed };
          if (!cancelled) {
            setSettings(next);
            setNetworkPrefix(parseNetworkPrefix(next.ipAddress));
          }
        }
      } catch (loadError) {
        console.warn('Unable to load saved printer settings', loadError);
      }

      try {
        const response = await fetch('/api/admin/pos-settings');
        const text = await response.text();
        if (!response.ok) throw new Error(`Unable to load printer settings (${response.status})`);
        const body = text ? JSON.parse(text) : {};
        const serverSettings = body.posPrinterSettings;
        if (!cancelled && serverSettings && typeof serverSettings === 'object') {
          const next = { ...DEFAULT_SETTINGS, ...serverSettings };
          setSettings(next);
          setNetworkPrefix(parseNetworkPrefix(next.ipAddress));
          localStorage.setItem('bobanest-pos-printer', JSON.stringify(next));
        }
      } catch (loadError) {
        if (!cancelled) {
          console.warn('Unable to load shared printer settings', loadError);
        }
      }
    };

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSettings = async (nextSettings = settings, successText = 'Printer settings saved.') => {
    try {
      localStorage.setItem('bobanest-pos-printer', JSON.stringify(nextSettings));
      const response = await fetch('/api/admin/pos-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'posPrinterSettings', value: nextSettings }),
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
      if (!response.ok) {
        throw new Error(body?.error || `Unable to save printer settings (${response.status})`);
      }
      setMessage(successText);
      setError('');
    } catch (saveError) {
      console.warn('Unable to save printer settings', saveError);
      setError(saveError.message || 'Unable to save printer settings.');
    }
  };

  const updateField = (field, value) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const selectDetectedPrinter = (printer) => {
    const next = {
      ...settings,
      mode: printer.type === 'bluetooth' ? 'bluetooth' : 'network',
      printerName: printer.name,
      ipAddress: printer.ip || '',
    };
    setSettings(next);
    saveSettings(next, `${printer.name} selected and saved.`);
  };

  const detectNetworkPrinters = async (deepScan = false) => {
    const prefix = parseNetworkPrefix(networkPrefix || settings.ipAddress);
    setNetworkPrefix(prefix);
    setSearching(true);
    setError('');
    setMessage(deepScan ? `Deep scanning ${prefix}1-254...` : `Quick scanning ${prefix}...`);
    setAvailablePrinters([]);

    try {
      const candidates = buildNetworkCandidates(prefix, deepScan);
      const batchSize = 24;
      const results = [];

      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        const scanned = await Promise.all(batch.map((ip) => probePrinterAddress(ip)));
        results.push(...scanned.filter(Boolean));
      }

      const discovered = normalizePrinterList(results);
      setAvailablePrinters(discovered);

      if (!discovered.length) {
        setMessage('No printers found automatically. Enter IP manually, then save.');
      } else {
        setMessage(`${discovered.length} printer(s) found. Tap one to use it.`);
      }
    } catch (scanError) {
      console.warn('Network printer scan failed', scanError);
      setError('Unable to scan network printers from this browser.');
      setAvailablePrinters([]);
    } finally {
      setSearching(false);
    }
  };

  const detectBluetoothPrinters = async () => {
    setSearching(true);
    setError('');
    setMessage('Searching nearby Bluetooth printers...');
    setAvailablePrinters([]);

    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth not supported on this browser/device.');
      }

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['device_information'],
      });

      const printer = {
        id: `bt-${device.id}`,
        name: device.name || 'Bluetooth Printer',
        ip: '',
        type: 'bluetooth',
      };

      const found = normalizePrinterList([printer]);
      setAvailablePrinters(found);
      selectDetectedPrinter(printer);
    } catch (bluetoothError) {
      setError('Bluetooth search was cancelled or not available on this device.');
      setAvailablePrinters([]);
    } finally {
      setSearching(false);
    }
  };

  const handleModeChange = async (mode) => {
    const next = { ...settings, mode };
    setSettings(next);
    setAvailablePrinters([]);
    setError('');
    setMessage('');

    if (mode === 'network') {
      await detectNetworkPrinters(false);
    } else if (mode === 'bluetooth') {
      await detectBluetoothPrinters();
    }
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Settings</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">Printer Setup</h1>
            <p className="text-gray-500 text-sm mt-2">
              Step 1: choose a printer mode. Step 2: search and select a printer. Step 3: save and print.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
          ) : null}
          {message ? (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">{message}</div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5 md:p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Printer mode</label>
                <select
                  value={settings.mode}
                  onChange={(event) => handleModeChange(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
                >
                  <option value="browser">Use browser printer dialog</option>
                  <option value="network">Network / Wi-Fi printer</option>
                  <option value="bluetooth">Bluetooth printer</option>
                  <option value="manual">Manual setup</option>
                </select>
              </div>

              {settings.mode === 'network' ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Network discovery</p>
                  <label className="block text-xs text-gray-600">Network prefix</label>
                  <input
                    type="text"
                    value={networkPrefix}
                    onChange={(event) => setNetworkPrefix(event.target.value)}
                    placeholder="192.168.1."
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => detectNetworkPrinters(false)}
                      disabled={searching}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                    >
                      {searching ? 'Searching...' : 'Quick Search'}
                    </button>
                    <button
                      type="button"
                      onClick={() => detectNetworkPrinters(true)}
                      disabled={searching}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                    >
                      Deep Search
                    </button>
                  </div>
                </div>
              ) : null}

              {settings.mode === 'bluetooth' ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Bluetooth discovery</p>
                  <button
                    type="button"
                    onClick={detectBluetoothPrinters}
                    disabled={searching}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                  >
                    {searching ? 'Searching...' : 'Search Bluetooth Printer'}
                  </button>
                </div>
              ) : null}

              {availablePrinters.length ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Available printers</p>
                  <div className="space-y-2">
                    {availablePrinters.map((printer) => (
                      <button
                        key={printer.id}
                        type="button"
                        onClick={() => selectDetectedPrinter(printer)}
                        className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-white px-3 py-2 text-left text-sm text-blue-900 hover:bg-blue-100"
                      >
                        <span>
                          <span className="font-medium block">{printer.name}</span>
                          <span className="text-xs text-blue-700 uppercase tracking-wide">{printer.type}</span>
                        </span>
                        <span className="text-xs text-blue-700">{printer.ip || 'Bluetooth'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Printer name</label>
                <input
                  type="text"
                  value={settings.printerName}
                  onChange={(event) => updateField('printerName', event.target.value)}
                  placeholder="Example: Epson TM-T88VII"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Printer IP / address</label>
                <input
                  type="text"
                  value={settings.ipAddress}
                  onChange={(event) => updateField('ipAddress', event.target.value)}
                  placeholder="192.168.1.50"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Copies</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={settings.printCopies}
                  onChange={(event) => updateField('printCopies', Number(event.target.value || 1))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
                />
              </div>

              <button
                type="button"
                onClick={() => saveSettings()}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save Printer Setup
              </button>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-100 p-5 md:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Current setup</h2>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Mode</p>
                <p className="font-semibold text-gray-900 mt-1">{settings.mode}</p>

                <p className="text-sm text-gray-500 mt-4">Printer name</p>
                <p className="font-semibold text-gray-900 mt-1">{settings.printerName || 'Not set'}</p>

                <p className="text-sm text-gray-500 mt-4">IP / address</p>
                <p className="font-semibold text-gray-900 mt-1">{settings.ipAddress || 'Not set'}</p>

                <p className="text-sm text-gray-500 mt-4">Copies</p>
                <p className="font-semibold text-gray-900 mt-1">{settings.printCopies}</p>
              </div>

              <div className="mt-5 rounded-lg bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500 mb-2">Notes</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                  <li>Network printers work best when iPad and printer are on the same Wi-Fi.</li>
                  <li>Bluetooth search support depends on browser/device compatibility.</li>
                  <li>If auto-search cannot find a printer, use manual printer name and IP.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
