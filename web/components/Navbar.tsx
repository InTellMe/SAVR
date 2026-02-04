'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🍳</span>
            <span className="text-xl font-bold text-gray-900">PantryHustler</span>
          </Link>

          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-gray-700 hover:text-orange-600 transition ${
                    pathname === '/dashboard' ? 'text-orange-600 font-semibold' : ''
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/inventory"
                  className={`text-gray-700 hover:text-orange-600 transition ${
                    pathname === '/inventory' ? 'text-orange-600 font-semibold' : ''
                  }`}
                >
                  Inventory
                </Link>
                <Link
                  href="/recipes"
                  className={`text-gray-700 hover:text-orange-600 transition ${
                    pathname === '/recipes' ? 'text-orange-600 font-semibold' : ''
                  }`}
                >
                  Recipes
                </Link>
                <Link
                  href="/meal-plans"
                  className={`text-gray-700 hover:text-orange-600 transition ${
                    pathname === '/meal-plans' ? 'text-orange-600 font-semibold' : ''
                  }`}
                >
                  Meal Plans
                </Link>
                <Link
                  href="/grocery-lists"
                  className={`text-gray-700 hover:text-orange-600 transition ${
                    pathname === '/grocery-lists' ? 'text-orange-600 font-semibold' : ''
                  }`}
                >
                  Grocery Lists
                </Link>
                <Link
                  href="/chat"
                  className={`text-gray-700 hover:text-orange-600 transition ${
                    pathname === '/chat' ? 'text-orange-600 font-semibold' : ''
                  }`}
                >
                  Chat
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-orange-600 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/pricing"
                  className="text-gray-700 hover:text-orange-600 transition"
                >
                  Pricing
                </Link>
                <Link
                  href="/sign-in"
                  className="text-gray-700 hover:text-orange-600 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
