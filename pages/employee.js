import { useState } from 'react';
import Link from 'next/link';

const API_SECRET = process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '';

export default function EmployeeClock() {
  const [assignedId, setAssignedId] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null);
  const [employeeMatched, setEmployeeMatched] = useState(false);

  async function checkStatus(idValue) {
    const value = idValue.trim();
    setStatus(null);
    setEmployeeMatched(false);
    if (!value) return;

    setChecking(true);
    try {
      const res = await fetch(`/api/employees/clock?assignedId=${encodeURIComponent(value)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessageType('error');
        setMessage(data?.error || 'Employee not found');
        return;
      }
      setEmployeeMatched(true);
      setStatus(data?.status === 'in' ? 'in' : 'out');
      setMessage('');
      setMessageType('');
    } catch (error) {
      setMessageType('error');
      setMessage('Unable to verify employee ID right now.');
    } finally {
      setChecking(false);
    }
  }

  async function handleClockAction() {
    if (!assignedId.trim()) {
      setMessageType('error');
      setMessage('Please enter your assigned employee ID.');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const res = await fetch('/api/employees/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-employee-secret': API_SECRET,
        },
        body: JSON.stringify({ assignedId: assignedId.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to submit.');

      const action = data?.type || (status === 'in' ? 'logout' : 'login');
      setStatus(action === 'login' ? 'in' : 'out');
      setMessageType('success');
      setMessage(`Success! You have been ${action === 'login' ? 'clocked in' : 'clocked out'}.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-3xl shadow-lg p-8">
        <div className="text-center mb-8">
          <p className="text-sm text-indigo-600 font-semibold uppercase tracking-[0.3em]">Employee Clock</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Clock In / Clock Out</h1>
          <p className="mt-3 text-slate-600">Enter your assigned employee ID and tap the button to record your shift.</p>
        </div>

        <div className="space-y-6">
          <label className="block text-sm font-medium text-slate-700">Assigned Employee ID</label>
          <input
            value={assignedId}
            onChange={(event) => {
              setAssignedId(event.target.value);
              setMessage('');
              setMessageType('');
            }}
            onBlur={() => checkStatus(assignedId)}
            placeholder="e.g. EMP-1A2B3C"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />

          {checking && <p className="text-sm text-slate-500">Checking employee ID...</p>}

          {employeeMatched && !checking && (
            <button
              type="button"
              disabled={loading}
              onClick={handleClockAction}
              className={`w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                status === 'in' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading ? 'Working...' : status === 'in' ? 'Clock Out' : 'Clock In'}
            </button>
          )}

          {message && (
            <div className={`rounded-2xl px-4 py-3 text-sm ${messageType === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {message}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">How it works</p>
            <ul className="mt-2 space-y-2 list-disc pl-5">
              <li>Use the ID given by your manager or admin.</li>
              <li>Enter your ID and click outside the field to verify.</li>
              <li>The page will show <strong>Clock In</strong> or <strong>Clock Out</strong> based on your current status.</li>
              <li>A confirmation will display instantly.</li>
            </ul>
          </div>

          <div className="text-center">
            <Link href="/employee-gift-cards" className="text-sm font-semibold text-indigo-600 underline">
              Open Gift Card Redemption
            </Link>
          </div>

          {!API_SECRET && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Admin note</p>
              <p className="mt-2">The employee clock page needs <code>NEXT_PUBLIC_EMPLOYEE_API_SECRET</code> to be configured in the environment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
