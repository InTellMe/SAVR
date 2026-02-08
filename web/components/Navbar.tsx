'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => pathname === path;

  const navLinkClass = (path: string) =>
    `text-sm font-medium transition-colors duration-200 ${
      isActive(path)
        ? 'text-[#00d4ff]'
        : 'text-[#9ca3c2] hover:text-white'
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(6, 9, 24, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="https://res.cloudinary.com/dksj2niho/image/upload/w_64,h_64,c_fit,q_auto,f_auto/v1770328403/SAVR_Logo_NO_BG_3_hixen3.png"
              alt="SAVR"
              width={32}
              height={32}
              className="w-8 h-8"
              unoptimized
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link href="/dashboard" className={navLinkClass('/dashboard')}>Dashboard</Link>
                <Link href="/upload" className={navLinkClass('/upload')}>Upload</Link>
                <Link href="/inventory" className={navLinkClass('/inventory')}>Inventory</Link>
                <Link href="/recipes" className={navLinkClass('/recipes')}>Recipes</Link>
                <Link href="/meal-plans" className={navLinkClass('/meal-plans')}>Meal Plans</Link>
                <Link href="/grocery-lists" className={navLinkClass('/grocery-lists')}>Lists</Link>
                <Link href="/chat" className={navLinkClass('/chat')}>Chat</Link>
                <Link href="/preferences" className={navLinkClass('/preferences')}>Preferences</Link>
                <Link href="/settings" className={navLinkClass('/settings')}>Settings</Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-[#9ca3c2] hover:text-[#00d4ff] transition-colors duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/pricing" className={navLinkClass('/pricing')}>Pricing</Link>
                <Link href="/faq" className={navLinkClass('/faq')}>FAQ</Link>
                <Link href="/sign-in" className="text-sm font-medium text-[#9ca3c2] hover:text-white transition-colors duration-200">
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="btn-primary text-sm !py-2.5 !px-5"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-[#9ca3c2] hover:text-white transition-colors"
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
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="md:hidden" style={{ background: 'rgba(6, 9, 24, 0.97)', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="px-4 py-4 space-y-1">
            {user ? (
              <>
                {[
                  { href: '/dashboard', label: 'Dashboard' },
                  { href: '/upload', label: 'Upload' },
                  { href: '/inventory', label: 'Inventory' },
                  { href: '/recipes', label: 'Recipes' },
                  { href: '/meal-plans', label: 'Meal Plans' },
                  { href: '/grocery-lists', label: 'Grocery Lists' },
                  { href: '/chat', label: 'Chat' },
                  { href: '/preferences', label: 'Preferences' },
                  { href: '/settings', label: 'Settings' },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`block py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                      isActive(href)
                        ? 'text-[#00d4ff] bg-[rgba(0,212,255,0.08)]'
                        : 'text-[#9ca3c2] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="block w-full text-left py-3 px-4 rounded-lg text-sm font-medium text-[#9ca3c2] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 px-4 rounded-lg text-sm font-medium text-[#9ca3c2] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/faq"
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 px-4 rounded-lg text-sm font-medium text-[#9ca3c2] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  FAQ
                </Link>
                <Link
                  href="/sign-in"
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 px-4 rounded-lg text-sm font-medium text-[#9ca3c2] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 px-4 rounded-lg text-sm font-semibold btn-primary text-center mt-2"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
