'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    axios.get('/api/orders/webhook').then(res => setOrders(res.data)).catch(() => setOrders([]));
  }, []);

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-6">Orders</h1>
          {orders.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            <table className="w-full bg-white rounded shadow">
              <thead className="bg-gray-100">
                <tr><th className="p-2 text-left">Customer</th><th>Total</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id} className="border-t">
                    <td className="p-2">{order.customerName}</td>
                    <td className="p-2">${order.totalAmount}</td>
                    <td className="p-2">{order.status}</td>
                    <td className="p-2">{new Date(order.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}