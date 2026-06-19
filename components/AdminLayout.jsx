import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useState, useRef } from 'react';

const NAV_GROUPS = [
  {
    label: 'Sales',
    links: [
      { href: '/admin/analytics', label: 'Analytics' },
      { href: '/admin/orders', label: 'Orders' },
      { href: '/admin/notify', label: '🔔 Order Alerts (iPad)' },
      { href: '/admin/customers', label: 'Customers' },
      { href: '/admin/walkin', label: 'Walk-in Log' },
      { href: '/admin/shift4-sync', label: '🔄 Shift4 Sync' },
      { href: '/admin/reviews', label: 'Reviews' },
    ],
  },
  {
    label: 'Products',
    links: [
      { href: '/admin/products', label: 'Products' },
      { href: '/admin/recipes', label: 'Recipes' },
      { href: '/admin/inventory', label: 'Inventory' },
      { href: '/admin/modifiers', label: 'Modifiers' },
    ],
  },
  {
    label: 'Marketing',
    links: [
      { href: '/admin/promotions', label: 'Promotions' },
      { href: '/admin/promo-codes', label: 'Promo Codes' },
      { href: '/admin/referrals', label: 'Referrals' },
      { href: '/admin/newsletter', label: 'Newsletter' },
      { href: '/admin/push', label: 'Push Notifications' },
      { href: '/admin/facebook-tracking', label: '📘 Facebook Ads' },
    ],
  },
  {
    label: 'Finance',
    links: [
      { href: '/admin/expenses', label: 'Expenses' },
      { href: '/admin/purchase-orders', label: 'Purchase Orders' },
      { href: '/admin/cost-analysis', label: 'Cost Analysis' },
      { href: '/admin/profit-analysis', label: 'Profit Analysis' },
    ],
  },
  {
    label: 'HR & Staff',
    links: [
      { href: '/admin/employees', label: '👥 Employees' },
      { href: '/admin/payments', label: '💰 Payroll' },
    ],
  },
  {
    label: 'Content',
    links: [
      { href: '/admin/daily-posts', label: 'Daily Posts' },
      { href: '/admin/hero', label: 'Hero Banner' },
      { href: '/admin/instagram', label: 'Instagram' },
    ],
  },
  {
    label: 'Settings',
    links: [
      { href: '/admin/store-hours', label: 'Store Hours' },
    ],
  },
];

function NavDropdown({ label, links, onLinkClick }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const handleEnter = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className="flex items-center gap-1 text-sm font-medium py-1 hover:text-yellow-300 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {label}
        <svg className={`w-3 h-3 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white text-gray-800 rounded-lg shadow-xl min-w-[170px] py-1 z-50 border border-gray-100">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onLinkClick}
              className="block px-4 py-2 text-sm hover:bg-gray-50 hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenu({ open, onClose }) {
  const [expanded, setExpanded] = useState(null);
  if (!open) return null;
  return (
    <div className="md:hidden bg-dark border-t border-white/10">
      {NAV_GROUPS.map(group => (
        <div key={group.label}>
          <button
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            onClick={() => setExpanded(e => e === group.label ? null : group.label)}
          >
            {group.label}
            <svg className={`w-4 h-4 transition-transform ${expanded === group.label ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded === group.label && (
            <div className="bg-black/20">
              {group.links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="block px-8 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="px-5 py-3 border-t border-white/10">
        <button
          onClick={() => signOut()}
          className="w-full text-sm bg-red-600 hover:bg-red-700 px-3 py-2 rounded font-medium transition-colors text-white"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-dark text-white px-4 md:px-6 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/admin/dashboard" className="font-bold text-lg tracking-tight hover:text-yellow-300 transition-colors">
            Bobanest Admin
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_GROUPS.map(group => (
              <NavDropdown key={group.label} label={group.label} links={group.links} />
            ))}
            <button
              onClick={() => signOut()}
              className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded font-medium transition-colors"
            >
              Logout
            </button>
          </div>
          {/* Hamburger */}
          <button
            className="md:hidden p-2 rounded hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main>{children}</main>
    </div>
  );
}