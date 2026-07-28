'use client';
import Link from 'next/link';
import { useCart } from './CartContext';
import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import CartDrawer from './CartDrawer';

export default function Navbar({ dark = false }) {
  const { totalItems, openCart } = useCart();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);

  const primaryLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Menu' },
    { href: '/build-your-own-fruit-tea', label: 'Build Tea' },
    { href: '/loyalty', label: 'Rewards' },
  ];
  const moreLinks = [
    { href: '/catering', label: 'Catering' },
    { href: '/gift-cards', label: 'Gift Cards' },
    { href: '/contact', label: 'Contact' },
    { href: '/track-order', label: 'Track Order' },
  ];

  const base = dark
    ? `${mobileMenuOpen ? 'bg-[#120a07]' : 'bg-[#120a07]/95 backdrop-blur'} border-b border-white/8 sticky top-0 z-50`
    : 'bg-white shadow-md sticky top-0 z-50';
  const logoText = dark ? 'text-[#e8a33d]' : 'text-primary';
  const linkClass = dark
    ? 'text-[#d4b896] hover:text-[#e8a33d] transition font-medium'
    : 'text-dark hover:text-primary transition';
  const cartColor = dark ? 'text-[#d4b896] hover:text-[#e8a33d]' : 'text-dark';
  const badgeBg = dark ? 'bg-[#e8a33d] text-[#1a0f0c]' : 'bg-secondary text-white';
  const hamburgerColor = dark ? 'text-[#d4b896]' : 'text-dark';
  const mobileOverlay = dark ? 'bg-[#120a07]' : 'bg-white';
  const mobileLinkClass = dark ? 'text-[#f5e6c8] hover:text-[#e8a33d] transition' : 'text-dark hover:text-primary transition';
  const dropdownBg = dark ? 'bg-[#1a0f0c] border-white/10' : 'bg-white border-gray-200';
  const dropdownLinkClass = dark
    ? 'block px-4 py-2 text-sm text-[#d4b896] hover:bg-white/5 hover:text-[#e8a33d] transition'
    : 'block px-4 py-2 text-sm text-dark hover:bg-gray-50 hover:text-primary transition';

  useEffect(() => {
    const onDocClick = (event) => {
      if (!moreMenuRef.current) return;
      if (!moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <>
    <nav className={base}>
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <div className={`h-10 w-10 ${dark ? 'bg-[#e8a33d]' : 'bg-primary'} rounded-full flex items-center justify-center ${dark ? 'text-[#1a0f0c]' : 'text-white'} font-bold text-xl`}>
              B
            </div>
            <span className={`text-xl sm:text-2xl font-bold ${logoText}`}>Bobanest</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-4 lg:space-x-5 items-center">
            {primaryLinks.map(link => (
              <Link key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ))}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setMoreMenuOpen((v) => !v)}
                className={`${linkClass} inline-flex items-center gap-1`}
                aria-haspopup="menu"
                aria-expanded={moreMenuOpen}
              >
                More
                <span className="text-xs">{moreMenuOpen ? '▲' : '▼'}</span>
              </button>
              {moreMenuOpen && (
                <div className={`absolute right-0 mt-2 w-44 rounded-xl border ${dropdownBg} shadow-xl py-1 z-50`}>
                  {moreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMoreMenuOpen(false)}
                      className={dropdownLinkClass}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {session && (
              <button onClick={() => signOut()} className="text-red-400 hover:text-red-300 transition">Logout</button>
            )}
          </div>

          {/* Cart & Mobile Button */}
          <div className="flex items-center space-x-4">
            <button
              onClick={openCart}
              className={`relative ${cartColor} transition`}
              aria-label="Open cart"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6M12 18v3" />
              </svg>
              {totalItems > 0 && (
                <span className={`absolute -top-2 -right-2 ${badgeBg} text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold`}>
                  {totalItems}
                </span>
              )}
            </button>
            <button
              className={`md:hidden p-2 rounded-md focus:outline-none ${hamburgerColor}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[100] md:hidden opacity-100"
          style={{ backgroundColor: dark ? '#120a07' : '#ffffff' }}
        >
          <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between">
            <span className={`text-lg font-bold ${logoText}`}>Menu</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2 rounded-md ${hamburgerColor}`}
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="h-[calc(100vh-4rem)] overflow-y-auto px-4 py-5">
            <div className="space-y-2">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-xl border border-white/10 px-4 py-3 text-base font-semibold ${mobileLinkClass}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 mb-2 text-xs uppercase tracking-widest text-[#6b4e37] font-bold">More</div>
            <div className="space-y-2">
              {moreLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-xl border border-white/10 px-4 py-3 text-base ${mobileLinkClass}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <Link
              href="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className={`block rounded-xl border border-white/10 px-4 py-3 text-base font-semibold mt-6 ${mobileLinkClass}`}
            >
              Cart ({totalItems})
            </Link>
            {session && (
              <button
                onClick={() => signOut()}
                className="text-red-400 hover:text-red-300 mt-6 w-full text-left px-1 py-2"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
    <CartDrawer />
  </>
  );
}