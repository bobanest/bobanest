'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

export default function FacebookTracking() {
  const [settings, setSettings] = useState({
    pixelId: '',
    accessToken: '',
    enabled: false,
    testEventCode: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/facebook-tracking');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/facebook-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        setMessage('✅ Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('❌ Failed to save settings');
      }
    } catch (error) {
      setMessage('❌ Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPixel = async () => {
    if (!settings.pixelId) {
      setMessage('❌ Please enter a Pixel ID first');
      return;
    }

    try {
      const res = await fetch('/api/admin/facebook-tracking/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixelId: settings.pixelId, testEventCode: settings.testEventCode })
      });

      if (res.ok) {
        const data = await res.json();
        setMessage('✅ ' + (data.message || 'Test event sent successfully! Check Facebook Events Manager.'));
      } else {
        const errorData = await res.json();
        let errorMsg = '❌ ' + (errorData.error || 'Failed to send test event');

        // Add troubleshooting info if available
        if (errorData.troubleshooting) {
          errorMsg += '\n💡 ' + errorData.troubleshooting;
        }

        // Add specific details for common issues
        if (errorData.code) {
          errorMsg += ` (Error ${errorData.code})`;
        }

        setMessage(errorMsg);
      }
    } catch (error) {
      setMessage('❌ Error sending test event: ' + error.message);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <p className="text-gray-400 py-12 text-center">Loading...</p>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Facebook Ad Tracking</h1>
              <p className="text-gray-500 text-sm mt-1">Configure Facebook Pixel and Conversion API for ad tracking</p>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-lg mb-6 ${message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Settings Form */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Tracking Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facebook Pixel ID
                  </label>
                  <input
                    type="text"
                    value={settings.pixelId}
                    onChange={(e) => setSettings({...settings, pixelId: e.target.value})}
                    placeholder="e.g. 123456789012345"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Found in Facebook Events Manager → Data Sources → Pixel</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token (Optional)
                  </label>
                  <input
                    type="password"
                    value={settings.accessToken}
                    onChange={(e) => setSettings({...settings, accessToken: e.target.value})}
                    placeholder="EAA..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">For Conversion API - get from Facebook Business Settings</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Event Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={settings.testEventCode}
                    onChange={(e) => setSettings({...settings, testEventCode: e.target.value})}
                    placeholder="TEST12345"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">For testing - found in Events Manager test events</p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                    Enable Facebook Tracking
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                  <button
                    onClick={handleTestPixel}
                    disabled={!settings.pixelId}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test Pixel
                  </button>
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-blue-800 mb-3">📊 What Gets Tracked</h3>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li>• <strong>Page Views</strong> - All pages visited</li>
                  <li>• <strong>Add to Cart</strong> - Products added to cart</li>
                  <li>• <strong>Initiate Checkout</strong> - Checkout started</li>
                  <li>• <strong>Purchase</strong> - Completed orders</li>
                  <li>• <strong>Lead</strong> - Contact form submissions</li>
                  <li>• <strong>Complete Registration</strong> - Loyalty signups</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-green-800 mb-3">🚀 Conversion API Benefits</h3>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Server-side tracking (more reliable)</li>
                  <li>• Better attribution for ad conversions</li>
                  <li>• Improved ad performance and ROI</li>
                  <li>• Works even with ad blockers</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-yellow-800 mb-3">📋 Setup Guide</h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-1">1. Create Facebook Pixel</h4>
                    <p className="text-sm text-yellow-700">Go to <a href="https://business.facebook.com/events_manager" target="_blank" className="underline">Facebook Events Manager</a> → Data Sources → Pixel → Create Pixel</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-1">2. Get Pixel ID</h4>
                    <p className="text-sm text-yellow-700">In Events Manager, go to Data Sources → Your Pixel → Settings → Pixel ID</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-1">3. Generate Access Token (Optional but Recommended)</h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <p>• Go to <a href="https://developers.facebook.com/apps" target="_blank" className="underline">Facebook Developers</a></p>
                      <p>• Create/select your app → Marketing API → Tools</p>
                      <p>• Generate access token with <code className="bg-yellow-100 px-1 rounded">ads_management</code> permission</p>
                      <p>• <strong>Note:</strong> Token expires - you'll need to refresh it periodically</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-1">4. Test Configuration</h4>
                    <p className="text-sm text-yellow-700">Use the "Test Pixel" button above. Check Facebook Events Manager for test events.</p>
                  </div>

                  <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>💡 Tip:</strong> Start with just the Pixel ID for basic tracking. Add the access token later for server-side conversion tracking.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}