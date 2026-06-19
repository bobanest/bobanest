'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';
import { fmtTime12 } from '@/lib/storeHoursHelper';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIMEZONES = [
  { value: 'America/New_York',   label: 'Eastern (ET)' },
  { value: 'America/Chicago',    label: 'Central (CT)' },
  { value: 'America/Denver',     label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Phoenix',    label: 'Mountain no DST (AZ)' },
  { value: 'Pacific/Honolulu',   label: 'Hawaii (HT)' },
];

const DEFAULT_WEEKLY = Array.from({ length: 7 }, (_, i) => ({
  day: i, isOpen: true, openTime: '10:00', closeTime: '21:00',
}));

export default function AdminStoreHours() {
  const [weekly, setWeekly] = useState(DEFAULT_WEEKLY);
  const [special, setSpecial] = useState([]);
  const [timezone, setTimezone] = useState('America/New_York');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // New special-date form
  const [newDate, setNewDate] = useState('');
  const [newIsOpen, setNewIsOpen] = useState(false);
  const [newOpenTime, setNewOpenTime] = useState('10:00');
  const [newCloseTime, setNewCloseTime] = useState('21:00');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetch('/api/admin/store-hours')
      .then(r => r.json())
      .then(d => {
        // Merge stored days with defaults (ensure all 7 are present)
        const wh = DEFAULT_WEEKLY.map(def => {
          const found = (d.weeklyHours || []).find(w => w.day === def.day);
          return found ? { ...def, ...found } : def;
        });
        setWeekly(wh);
        setSpecial((d.specialHours || []).slice().sort((a, b) => a.date.localeCompare(b.date)));
        setTimezone(d.timezone || 'America/New_York');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateDay = (day, field, value) =>
    setWeekly(prev => prev.map(d => d.day === day ? { ...d, [field]: value } : d));

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/store-hours', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeklyHours: weekly, specialHours: special, timezone }),
    });
    setSaving(false);
    setMsg(res.ok ? '✓ Hours saved' : 'Error saving hours');
    setTimeout(() => setMsg(''), 3000);
  };

  const addSpecial = () => {
    if (!newDate) return;
    if (special.find(s => s.date === newDate)) {
      setMsg('That date already has special hours — remove it first.');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setSpecial(prev =>
      [...prev, { date: newDate, isOpen: newIsOpen, openTime: newOpenTime, closeTime: newCloseTime, note: newNote }]
        .sort((a, b) => a.date.localeCompare(b.date))
    );
    setNewDate(''); setNewIsOpen(false); setNewOpenTime('10:00'); setNewCloseTime('21:00'); setNewNote('');
  };

  const removeSpecial = (date) => setSpecial(prev => prev.filter(s => s.date !== date));

  if (loading) {
    return (
      <ProtectedRoute><AdminLayout>
        <div className="p-8 text-center text-gray-400">Loading…</div>
      </AdminLayout></ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-4 md:p-8 max-w-3xl mx-auto">

          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold">Store Hours</h1>
              <p className="text-gray-500 text-sm mt-1">
                Set regular weekly hours and holiday overrides. Customers can only place or schedule orders during open hours.
              </p>
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50 whitespace-nowrap">
              {saving ? 'Saving…' : 'Save Hours'}
            </button>
          </div>

          {msg && <p className={`text-sm mb-4 ${msg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}

          {/* Timezone */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-5 mb-5">
            <label className="block text-sm font-semibold mb-2">Timezone</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="border rounded-lg p-2 text-sm w-full md:w-auto"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">All hours are in this timezone.</p>
          </div>

          {/* Weekly Hours */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-5 mb-5">
            <h2 className="font-bold text-lg mb-4">Regular Weekly Hours</h2>
            <div className="space-y-4">
              {weekly.map(day => (
                <div key={day.day} className="flex flex-wrap items-center gap-3">
                  <span className="w-24 text-sm font-medium text-gray-700">{DAY_NAMES[day.day]}</span>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => updateDay(day.day, 'isOpen', !day.isOpen)}
                      className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${day.isOpen ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${day.isOpen ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <span className={`text-sm font-semibold ${day.isOpen ? 'text-green-600' : 'text-gray-400'}`}>
                      {day.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </label>
                  {day.isOpen && (
                    <>
                      <input
                        type="time"
                        value={day.openTime}
                        onChange={e => updateDay(day.day, 'openTime', e.target.value)}
                        className="border rounded-lg p-1.5 text-sm"
                      />
                      <span className="text-gray-400 text-sm">–</span>
                      <input
                        type="time"
                        value={day.closeTime}
                        onChange={e => updateDay(day.day, 'closeTime', e.target.value)}
                        className="border rounded-lg p-1.5 text-sm"
                      />
                      <span className="text-xs text-gray-400 hidden sm:inline">
                        {fmtTime12(day.openTime)} – {fmtTime12(day.closeTime)}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Special Hours */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-5 mb-5">
            <h2 className="font-bold text-lg mb-1">Special Hours</h2>
            <p className="text-xs text-gray-400 mb-4">
              Overrides weekly hours for specific dates — holidays, events, etc.
              Special hours take priority over regular hours.
            </p>

            {special.length > 0 ? (
              <div className="overflow-x-auto mb-5">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="text-left p-2 pl-3">Date</th>
                      <th className="text-center p-2">Status</th>
                      <th className="text-center p-2">Hours</th>
                      <th className="text-left p-2">Note</th>
                      <th className="p-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {special.map(s => (
                      <tr key={s.date} className="border-t hover:bg-gray-50">
                        <td className="p-2 pl-3 font-medium">{s.date}</td>
                        <td className="p-2 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {s.isOpen ? 'Open' : 'Closed'}
                          </span>
                        </td>
                        <td className="p-2 text-center text-xs text-gray-500">
                          {s.isOpen ? `${fmtTime12(s.openTime)} – ${fmtTime12(s.closeTime)}` : '—'}
                        </td>
                        <td className="p-2 text-xs text-gray-400">{s.note}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => removeSpecial(s.date)}
                            className="text-red-400 hover:text-red-600 text-xs font-medium"
                          >Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">No special dates set.</p>
            )}

            {/* Add special date form */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-3">Add a Special Date</p>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date *</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select
                    value={newIsOpen ? 'open' : 'closed'}
                    onChange={e => setNewIsOpen(e.target.value === 'open')}
                    className="border rounded-lg p-2 text-sm"
                  >
                    <option value="closed">Closed all day</option>
                    <option value="open">Open (special hours)</option>
                  </select>
                </div>
                {newIsOpen && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Open</label>
                      <input type="time" value={newOpenTime} onChange={e => setNewOpenTime(e.target.value)} className="border rounded-lg p-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Close</label>
                      <input type="time" value={newCloseTime} onChange={e => setNewCloseTime(e.target.value)} className="border rounded-lg p-2 text-sm" />
                    </div>
                  </>
                )}
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Christmas Day"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    className="border rounded-lg p-2 text-sm w-full"
                  />
                </div>
                <button
                  onClick={addSpecial}
                  disabled={!newDate}
                  className="btn-primary text-sm disabled:opacity-50 whitespace-nowrap"
                >
                  Add Date
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving…' : 'Save All Hours'}
            </button>
          </div>

        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
