'use client';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const isActive = (path) => router.pathname === path ? 'font-bold underline' : '';

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-dark text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/admin/dashboard" className="text-xl font-bold">Bobanest Admin</Link>
            <div className="flex space-x-6">
              <Link href="/admin/products" className={`hover:text-primary transition ${isActive('/admin/products')}`}>Products</Link>
              <Link href="/admin/orders" className={`hover:text-primary transition ${isActive('/admin/orders')}`}>Orders</Link>
              <Link href="/admin/daily-posts" className={`hover:text-primary transition ${isActive('/admin/daily-posts')}`}>Daily Posts</Link>
              <Link href="/admin/reports" className={`hover:text-primary transition ${isActive('/admin/reports')}`}>Reports</Link>
              <button onClick={() => signOut()} className="bg-red-600 px-3 py-1 rounded hover:bg-red-700">Logout</button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}