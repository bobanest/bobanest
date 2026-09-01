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

const NETWORK_PREFIXES = ['192.168.1.', '192.168.0.', '10.0.0.', '10.0.1.'];

function normalizePrinterList(list) {
  const seen = new Set();
  return list.filter((printer) => {
    const key = `${printer.type}:${printer.name}:${printer.ip || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function PrinterSetupPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bobanest-pos-printer');
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setSettings({ ...DEFAULT_SETTINGS, ...parsed });
    } catch (loadError) {
      console.warn('Unable to load saved printer settings', loadError);
    }
  }, []);

  const saveSettings = () => {
    try {
      localStorage.setItem('bobanest-pos-printer', JSON.stringify(settings));
      setMessage('Printer settings saved.');
      setError('');
    } catch (saveError) {
      console.warn('Unable to save printer settings', saveError);
      setError('Unable to save printer settings in this browser.');
    }
  };

  const updateField = (field, value) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const handleModeChange = (mode) => {
    updateField('mode', mode);
    setAvailablePrinters([]);
    setError('');
    setMessage('');
  };

  const detectNetworkPrinters = async () => {
    setSearching(true);
    setError('');
    setMessage('Searching local network printers...');

    try {
      const results = [];

      for (const prefix of NETWORK_PREFIXES) {
        for (let i = 1; i <= 254; i += 1) {
          const ip = `${prefix}${i}`;
          try {
            const response = await fetch(`http://${ip}:9100`, {
              method: 'HEAD',
              mode: 'no-cors',
            });
            if (response) {
              results.push({
                id: `net-${ip}`,
                name: `Network Printer ${ip}`,
                ip,
                type: 'network',
              });
            }
          } catch (err) {
            // Ignore unreachable addresses when scanning the network.
          }
        }
      }

      const discovered = normalizePrinterList(results);
      setAvailablePrinters(discovered);

      if (!discovered.length) {
        setMessage('No network printers were detected automatically. You can still enter an IP manually.');
      } else {
        setMessage(`${discovered.length} network printer(s) detected.`);
      }
    } catch (err) {
      setError('Unable to scan the local network for printers in this browser.');
      setAvailablePrinters([]);
    } finally {
      setSearching(false);
    }
  };

  const detectBluetoothPrinters = async () => {
    setSearching(true);
    setError('');
    setMessage('Checking for nearby Bluetooth printers...');

    try {
      if (!navigator.bluetooth) {
        throw new Error('Bluetooth is not supported in this browser/device.');
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

      setAvailablePrinters(normalizePrinterList([printer]));
      setMessage(`Bluetooth printer selected: ${printer.name}`);
      updateField('printerName', printer.name);
      updateField('mode', 'bluetooth');
    } catch (err) {
      setError('Bluetooth discovery was not available or was cancelled. You can still enter details manually.');
      setAvailablePrinters([]);
    } finally {
      setSearching(false);
    }
  };

  const selectDetectedPrinter = (printer) => {
    updateField('printerName', printer.name);
    updateField('ipAddress', printer.ip || '');
    updateField('mode', printer.type === 'bluetooth' ? 'bluetooth' : 'network');
    setMessage(`${printer.name} selected for receipt printing.`);
    setError('');
  };

  useEffect(() => {
    if (settings.mode === 'network') {
      detectNetworkPrinters();
      return;
    }
    if (settings.mode === 'bluetooth') {
      detectBluetoothPrinters();
      return;
    }
    setAvailablePrinters([]);
  }, [settings.mode]);

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">Settings</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-1">Printer Setup</h1>
            <p className="text-gray-500 text-sm mt-2">
              Choose the receipt printer method for the Bobanest POS. This helps the cash register know how to print receipts on the selected device.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
          ) : null}
          {message ? (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">{message}</div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="bg-white rounded-xl shadow border border-gray-100 p-5 md:p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Printer mode</label>
                  <select
                    value={settings.mode}
                    onChange={(e) => handleModeChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
                  >
                    <option value="browser">Use browser default printer</option>
                    <option value="network">Use network / Wi‑Fi printer</option>
                    <option value="bluetooth">Use Bluetooth printer</option>
                    <option value="manual">Manual print setup</option>
                  </select>
                  {(settings.mode === 'network' || settings.mode === 'bluetooth') ? (
                    <p className="text-xs text-gray-500 mt-2">
                      Selecting this mode automatically searches available printers.
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Printer name</label>
                  <input
                    type="text"
                    value={settings.printerName}
                    onChange={(e) => updateField('printerName', e.target.value)}
                    placeholder="Example: Epson TM-T88VII"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Printer IP / address</label>
                  <input
                    type="text"
                    value={settings.ipAddress}
                    onChange={(e) => updateField('ipAddress', e.target.value)}
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
                    onChange={(e) => updateField('printCopies', Number(e.target.value || 1))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Detect printers</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={detectNetworkPrinters}
                      disabled={searching}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                    >
                      {searching ? 'Searching...' : 'Search network printers'}
                    </button>
                    <button
                      type="button"
                      onClick={detectBluetoothPrinters}
                      disabled={searching}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                    >
                      Search Bluetooth printers
                    </button>
                  </div>

                  {availablePrinters.length ? (
                    <div className="mt-4 space-y-2">
                      {availablePrinters.map((printer) => (
                        <button
                          key={printer.id}
                          type="button"
                          onClick={() => selectDetectedPrinter(printer)}
                          className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm text-blue-900 hover:bg-blue-100"
                        >
                          <span>
                            <span className="font-medium block">{printer.name}</span>
                            <span className="text-xs text-blue-700 uppercase tracking-wide">{printer.type}</span>
                          </span>
                          <span className="text-xs text-blue-700">{printer.ip || 'Bluetooth'}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={saveSettings}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save Printer Settings
                </button>
              </div>
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
                  <li>iPad browsers usually use the browser default printer flow.</li>
                  <li>Network and Bluetooth printers work best when connected on the same network or paired device.</li>
                  <li>Cash drawers usually connect to the receipt printer, not directly to the iPad.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
