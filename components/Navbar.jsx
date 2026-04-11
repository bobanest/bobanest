import Link from 'next/link';
import { useCart } from './CartContext';
import { useState } from 'react';

export default function Navbar() {
  const { totalItems } = useCart();
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
              B
            </div>
            <span className="text-2xl font-bold text-primary">Bobanest</span>
          </Link>

          <div className="hidden md:flex space-x-8">
            <Link href="/" className="text-dark hover:text-primary">Home</Link>
            <Link href="/products" className="text-dark hover:text-primary">Products</Link>
            <Link href="/catering" className="text-dark hover:text-primary">Catering</Link>
            <Link href="/contact" className="text-dark hover:text-primary">Contact</Link>
          </div>

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
            <button className="md:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="md:hidden py-4 border-t">
            <Link href="/" className="block py-2 hover:text-primary">Home</Link>
            <Link href="/products" className="block py-2 hover:text-primary">Products</Link>
            <Link href="/catering" className="block py-2 hover:text-primary">Catering</Link>
            <Link href="/contact" className="block py-2 hover:text-primary">Contact</Link>
          </div>
        )}
      </div>
    </nav>
  );
}