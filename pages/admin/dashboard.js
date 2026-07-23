'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';

export default function AdminDashboard() {
  const adminLinks = [
    // Sales & Orders
    { href: '/admin/analytics', label: '📊 Sales Analytics', desc: 'Revenue, top products, order volume charts' },
    { href: '/admin/orders', label: '🛒 Orders', desc: 'View and update order status' },
    { href: '/admin/customers', label: '👥 Customers', desc: 'View customer history, spending, and points' },
    // Products & Inventory
    { href: '/admin/products', label: '📦 Products', desc: 'Manage product catalog' },
    { href: '/admin/inventory', label: '🗃️ Inventory', desc: 'Stock levels, in-stock toggles, low-stock alerts' },
    // Financials
    { href: '/admin/expenses', label: '💸 Expenses', desc: 'Track business costs by category and month' },
    { href: '/admin/purchase-orders', label: '📋 Purchase Orders', desc: 'Create and track supplier POs' },
    { href: '/admin/gift-cards', label: '🎁 Gift Cards', desc: 'Manage virtual gift cards, balances, and redemptions' },
    // HR
    { href: '/admin/attendance-manual', label: '🕒 Manual Clock Entry', desc: 'Add and correct employee clock in/out records' },
    { href: '/admin/employee-schedule', label: '🗓️ Work Schedule', desc: 'Manage monthly shifts and automatic employee reminders' },
    { href: '/admin/payment-records', label: '💳 Payment Records', desc: 'Manage payroll payment records and statuses' },
    { href: '/admin/payment-history', label: '📜 Payment History', desc: 'Review full payment ledger timeline' },
    // Marketing
    { href: '/admin/promotions', label: '🏷️ Promotions', desc: 'Create site-wide promotional banners' },
    { href: '/admin/promo-codes', label: '🎟️ Promo Codes', desc: 'Create & manage coupon/discount codes' },
    { href: '/admin/newsletter', label: '📬 Newsletter', desc: 'View subscribers & export CSV' },
    { href: '/admin/push', label: '🔔 Push Notifications', desc: 'Send deals & alerts to subscribers' },
    // Content
    { href: '/admin/modifiers', label: '🧋 Modifiers', desc: 'Manage drink add-ons and toppings' },
    { href: '/admin/hero', label: '🎨 Hero Section', desc: 'Change homepage hero image and text' },
    { href: '/admin/daily-posts', label: '📸 Daily Posts', desc: 'Manage Instagram feed (static)' },
    { href: '/admin/instagram', label: '📷 Instagram Settings', desc: 'Set your Instagram handle' },
    { href: '/admin/reports', label: '📍 Visitor Reports', desc: 'Visitor location analytics' },
  ];

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

          {[
            { label: 'Sales & Orders', links: adminLinks.slice(0, 3) },
            { label: 'Products & Inventory', links: adminLinks.slice(3, 5) },
            { label: 'Financials', links: adminLinks.slice(5, 8) },
            { label: 'HR & Payroll', links: adminLinks.slice(8, 12) },
            { label: 'Marketing', links: adminLinks.slice(12, 16) },
            { label: 'Content & Settings', links: adminLinks.slice(16) },
          ].map(section => (
            <div key={section.label} className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{section.label}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.links.map(link => (
                  <Link key={link.href} href={link.href} className="bg-white p-5 rounded-lg shadow hover:shadow-lg hover:border-primary border border-transparent transition">
                    <h3 className="text-lg font-bold text-primary">{link.label}</h3>
                    <p className="text-gray-500 text-sm mt-1">{link.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}