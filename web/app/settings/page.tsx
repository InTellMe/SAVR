'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth, isPaidTier } from '@/contexts/AuthContext';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useState } from 'react';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { user, userData, logout } = useAuth();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState('');

  const tierLabel =
    userData?.subscriptionTier === 'premium'
      ? 'Premium'
      : userData?.subscriptionTier === 'plus' || userData?.subscriptionTier === 'pro'
        ? 'Plus'
        : 'Basic';
  const hasPaidTier = isPaidTier(userData?.subscriptionTier);

  async function handleManageSubscription() {
    if (!user) return;

    setLoadingPortal(true);
    setError('');

    try {
      const createStripePortal = httpsCallable(functions, 'createStripePortal');
      const result = await createStripePortal({
        returnUrl: `${window.location.origin}/settings`,
      });

      const data = result.data as { success: boolean; url: string };
      if (!data.success) {
        throw new Error('Portal creation failed');
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      setError('Failed to open billing portal. Please try again.');
      setLoadingPortal(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Settings</h1>
        <p className="text-gray-600 mb-8">
          Manage your account details, subscription, and preferences.
        </p>

        {error && (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {/* Account section */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium">Email:</span> {user?.email}
            </p>
            <p>
              <span className="font-medium">Subscription tier:</span> {tierLabel}
            </p>
            {userData?.subscriptionStatus && (
              <p>
                <span className="font-medium">Subscription status:</span>{' '}
                <span className="capitalize">{userData.subscriptionStatus}</span>
              </p>
            )}
          </div>
        </section>

        {/* Subscription section */}
        <section className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription</h2>

          {hasPaidTier ? (
            <>
              <p className="mb-4 text-sm text-gray-700">
                You&apos;re on the <span className="font-semibold text-orange-600">{tierLabel}</span> plan
                with access to unlimited recipes, meal plans, AI chat, and more.
              </p>
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {loadingPortal ? 'Opening portal...' : 'Manage billing'}
              </button>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-700">
                You&apos;re on the <span className="font-semibold">Basic</span> plan. Upgrade to Plus or
                Premium to unlock unlimited recipes, AI chat, and more.
              </p>
              <Link
                href="/pricing"
                className="inline-block rounded-lg bg-orange-600 px-5 py-2 text-sm font-medium text-white hover:bg-orange-700"
              >
                View plans
              </Link>
            </>
          )}
        </section>

        {/* Danger zone */}
        <section className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-xl font-semibold text-red-900 mb-3">Danger zone</h2>
          <p className="mb-4 text-sm text-red-800">
            Log out of your account on this device. Account deletion is not yet available in the app.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Log out
          </button>
        </section>
      </div>
    </div>
  );
}

