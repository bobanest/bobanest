import { useState, useEffect } from 'react';

const API_SECRET = process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '';

export default function EmployeeClock() {
  const [assignedId, setAssignedId] = useState('');
  const [status, setStatus] = useState('unknown');
  const [isValidId, setIsValidId] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = assignedId.trim();
    if (!id) {
      setStatus('unknown');
      setIsValidId(false);
      setCheckingStatus(false);
      return;
    }

    setCheckingStatus(true);
    const timeout = setTimeout(() => {
      fetchStatus(id);
    }, 300);

    return () => clearTimeout(timeout);
  }, [assignedId]);

  const fetchStatus = async (id) => {
    try {
      const response = await fetch(`/api/employees/clock?assignedId=${encodeURIComponent(id)}`);
      if (!response.ok) {
        setStatus('unknown');
        setIsValidId(false);
        return;
      }
      const data = await response.json();
      setStatus(data.status || 'out');
      setIsValidId(true);
    } catch (error) {
      setStatus('unknown');
      setIsValidId(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleToggleClock = async () => {
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
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update attendance.');
      }

      const newState = data.type === 'login' ? 'in' : 'out';
      setStatus(newState);
      setMessageType('success');
      setMessage(`Successfully ${newState === 'in' ? 'clocked in' : 'clocked out'}.`);
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const actionLabel = status === 'in' ? 'Clock Out' : 'Clock In';

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
            onChange={(event) => setAssignedId(event.target.value)}
            placeholder="e.g. EMP-1A2B3C"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />

          <div className="text-sm text-slate-600">
            {checkingStatus && 'Checking employee ID...'}
            {!checkingStatus && status === 'in' && 'Current status: Clocked in'}
            {!checkingStatus && status === 'out' && 'Current status: Clocked out'}
            {!checkingStatus && status === 'unknown' && assignedId.trim() && !isValidId && 'Employee ID not found'}
            {!checkingStatus && status === 'unknown' && !assignedId.trim() && 'Enter your assigned employee ID to see the action button.'}
          </div>

          {isValidId && (
            <button
              type="button"
              disabled={loading}
              onClick={handleToggleClock}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Working...' : actionLabel}
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
              <li>Use the assigned employee ID from HR.</li>
              <li>The button automatically toggles between clock in and clock out.</li>
              <li>Watch for the success confirmation after submitting.</li>
            </ul>
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
