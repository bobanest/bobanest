'use client';
import Link from 'next/link';
import { useCart } from './CartContext';
import { useState } from 'react';

export default function Navbar() {
  const { totalItems } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Menu' },
    { href: '/catering', label: 'Catering' },
    { href: '/contact', label: 'Contact' },
    { href: '/track-order', label: 'Track Order' },
    { href: '/loyalty', label: 'Rewards' },
    { href: '/employee', label: 'Employee Clock' },
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
              B
            </div>
            <span className="text-2xl font-bold text-primary">Bobanest</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className="text-dark hover:text-primary transition">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Cart & Mobile Button */}
          <div className="flex items-center space-x-4">
            <Link href="/cart" className="relative">
              <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6M12 18v3" />
              </svg>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-secondary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              className="md:hidden p-2 rounded-md focus:outline-none"
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

      {/* Modern Mobile Menu - Full screen overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white md:hidden">
          <div className="flex flex-col items-center justify-center h-full space-y-8 text-xl">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-dark hover:text-primary transition"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/cart" onClick={() => setMobileMenuOpen(false)} className="text-dark hover:text-primary">
              Cart ({totalItems})
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}