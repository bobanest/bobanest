'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useState, useEffect } from 'react';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments', { 
        headers: { 'x-employee-secret': process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '' } 
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPayments(data);
    } catch (err) { 
      console.error(err);
      setMsg('Failed to load payments');
      setMsgType('error');
    } finally { 
      setLoading(false); 
    }
  }

  async function runPayroll(e) {
    e.preventDefault();
    setMsg('');
    if (!start || !end) {
      setMsg('Please select both start and end dates');
      setMsgType('error');
      return;
    }
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate >= endDate) {
      setMsg('End date must be after start date');
      setMsgType('error');
      return;
    }

    setRunning(true);
    try {
      const res = await fetch('/api/admin/payments/calculate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-employee-secret': process.env.NEXT_PUBLIC_EMPLOYEE_API_SECRET || '' 
        },
        body: JSON.stringify({ periodStart: start, periodEnd: end })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Payroll calculated for ${data.payments?.length || 0} employees!`);
        setMsgType('success');
        fetchList();
      } else {
        setMsg('Error: ' + (data.error || 'Failed to calculate payroll'));
        setMsgType('error');
      }
    } catch (err) { 
      setMsg('Error running payroll');
      setMsgType('error');
      console.error(err);
    } finally {
      setRunning(false);
    }
  }

  const totalGross = payments.reduce((sum, p) => sum + (p.gross || 0), 0);
  const totalHours = payments.reduce((sum, p) => sum + (p.hours || 0), 0);

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-6xl mx-auto p-8">
          <h1 className="text-4xl font-bold mb-2">💰 Payroll Management</h1>
          <p className="text-gray-600 mb-8">Calculate and manage employee payments</p>

          {msg && (
            <div className={`p-4 rounded-lg mb-6 ${msgType === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {msg}
            </div>
          )}

          {/* Calculate Payroll Section */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">🧮 Calculate Payroll</h2>
            <form onSubmit={runPayroll} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Start *</label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period End *</label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={running}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium px-4 py-2 rounded-lg transition"
              >
                {running ? 'Calculating...' : 'Calculate Payroll'}
              </button>
            </form>
          </div>

          {/* Payments Summary */}
          {payments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <p className="text-blue-700 text-sm font-medium">Total Hours</p>
                <p className="text-3xl font-bold text-blue-900">{totalHours.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                <p className="text-green-700 text-sm font-medium">Total Payroll</p>
                <p className="text-3xl font-bold text-green-900">${totalGross.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                <p className="text-purple-700 text-sm font-medium">Employees</p>
                <p className="text-3xl font-bold text-purple-900">{payments.length}</p>
              </div>
            </div>
          )}

          {/* Payments List */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">Payment Records ({payments.length})</h2>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin">⏳</div>
                <p className="mt-2">Loading payments...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p>No payments calculated yet. Run payroll for a period above to get started!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Period</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Hours</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Gross Pay</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {p.employee?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {p.hours?.toFixed(2)} hrs
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-green-700">
                          ${p.gross?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            p.status === 'paid' ? 'bg-green-100 text-green-800' :
                            p.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {p.status?.charAt(0).toUpperCase() + p.status?.slice(1) || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
