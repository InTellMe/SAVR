'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth, isProTier } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getDataConsent, upsertDataConsent } from '@/lib/db';
import { callApi } from '@/lib/api';

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
  const [consentLoading, setConsentLoading] = useState(true);
  const [consent, setConsent] = useState<{
    imageTraining: boolean;
    interactionAnalytics: boolean;
    consentDate?: string;
  }>({ imageTraining: false, interactionAnalytics: false });

  useEffect(() => {
    async function loadConsent() {
      if (!user) return;
      try {
        const data = await getDataConsent(user.id);
        if (data) {
          setConsent({
            imageTraining: data.data_usage_for_training ?? false,
            interactionAnalytics: data.analytics_tracking ?? false,
            consentDate: new Date(data.updated_at).toLocaleDateString(),
          });
        }
      } catch (err) {
        console.error('Failed to load consent:', err);
      } finally {
        setConsentLoading(false);
      }
    }
    loadConsent();
  }, [user]);

  async function handleConsentChange(field: 'imageTraining' | 'interactionAnalytics', value: boolean) {
    if (!user) return;
    const updated = { ...consent, [field]: value };
    setConsent(updated);
    try {
      await upsertDataConsent(user.id, {
        marketing_emails: false, // Default value
        data_usage_for_training: updated.imageTraining,
        analytics_tracking: updated.interactionAnalytics,
        consent_version: '1.0',
      });
    } catch (err) {
      console.error('Failed to save consent:', err);
      setConsent({ ...consent, [field]: !value }); // revert on failure
    }
  }

  const tier = userData?.subscription_tier;
  const tierLabel = 
    tier === 'pro' || tier === 'plus' || tier === 'premium' ? 'Pro' : 'Basic';
  const hasPro = isProTier(userData?.subscription_tier);

  async function handleManageSubscription() {
    if (!user) return;

    setLoadingPortal(true);
    setError('');

    try {
      const result = await callApi('/stripe/portal', {});

      const data = result as { success: boolean; url: string };
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
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />

      <div className="container mx-auto px-4 pt-24 pb-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-white mb-4">Settings</h1>
        <p className="text-[#9ca3c2] mb-8">
          Manage your account details, subscription, and preferences.
        </p>

        {error && (
          <div className="mb-6 rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400">
            {error}
          </div>
        )}

        {/* Account section */}
        <section className="mb-6 rounded-lg glass-card p-6 shadow">
          <h2 className="text-xl font-semibold text-white mb-4">Account</h2>
          <div className="space-y-2 text-sm text-[#9ca3c2]">
            <p>
              <span className="font-medium">Email:</span> {user?.email}
            </p>
            {userData?.stripe_email && userData.stripe_email !== user?.email && (
              <p>
                <span className="font-medium">Billing email:</span> {userData.stripe_email}
              </p>
            )}
            <p>
              <span className="font-medium">Subscription tier:</span> {tierLabel}
            </p>
            {userData?.subscription_status && (
              <p>
                <span className="font-medium">Subscription status:</span>{' '}
                <span className="capitalize">{userData.subscription_status}</span>
              </p>
            )}
            {userData?.cancel_at_period_end && (
              <p className="text-amber-400">
                Your subscription will cancel at the end of the current billing period.
              </p>
            )}
            {userData?.payment_action_required && (
              <p className="text-red-400">
                Payment action required. Please update your payment method in the billing portal.
              </p>
            )}
            {userData?.last_payment_status === 'failed' && (
              <p className="text-red-400">
                Your last payment failed. Please update your payment method to maintain access.
              </p>
            )}
          </div>
        </section>

        {/* Subscription section */}
        <section className="mb-6 rounded-lg glass-card p-6 shadow">
          <h2 className="text-xl font-semibold text-white mb-4">Subscription</h2>

          <p className="mb-4 text-sm text-[#9ca3c2]">
            You&apos;re on the <span className="font-semibold text-[#00d4ff]">{tierLabel}</span> plan.{' '}
            {hasPro
              ? 'You have access to unlimited recipes, meal plans, AI chat, and more.'
              : 'Upgrade to Pro to unlock unlimited recipes, AI chat, and more.'}
          </p>
          <div className="flex flex-wrap gap-3">
            {userData?.stripe_customer_id && (
              <button
                type="button"
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold px-5 py-2 text-sm hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] disabled:opacity-50"
              >
                {loadingPortal ? 'Opening portal...' : 'Manage billing'}
              </button>
            )}
            {!hasPro && (
              <Link
                href="/pricing"
                className="inline-block rounded-lg bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white font-semibold px-5 py-2 text-sm hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
              >
                Upgrade to Pro
              </Link>
            )}
          </div>
        </section>

        {/* Preferences link */}
        <section className="mb-6 rounded-lg glass-card p-6 shadow">
          <h2 className="text-xl font-semibold text-white mb-2">Food Preferences</h2>
          <p className="mb-4 text-sm text-[#9ca3c2]">
            Set your favorite cuisines, dietary preferences, and restrictions so the AI can personalize every recipe and meal plan.
          </p>
          <Link
            href="/preferences"
            className="inline-block rounded-lg bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white font-semibold px-5 py-2 text-sm hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
          >
            Manage preferences
          </Link>
        </section>

        {/* Data & Privacy section */}
        <section className="mb-6 rounded-lg glass-card p-6 shadow">
          <h2 className="text-xl font-semibold text-white mb-2">Data &amp; Privacy</h2>
          <p className="mb-4 text-sm text-[#9ca3c2]">
            Help improve SAVR by allowing us to use your anonymized data for training. You can change these settings at any time. See our{' '}
            <Link href="/privacy" className="text-[#00d4ff] hover:underline">Privacy Policy</Link> for details.
          </p>

          {consentLoading ? (
            <p className="text-sm text-[#9ca3c2]">Loading preferences...</p>
          ) : (
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.imageTraining}
                  onChange={(e) => handleConsentChange('imageTraining', e.target.checked)}
                  className="mt-1 accent-[#00d4ff] w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-white">Image &amp; inventory data</p>
                  <p className="text-xs text-[#9ca3c2]">
                    Allow SAVR to use your uploaded pantry images and ingredient data (anonymized) to improve food recognition accuracy for all users.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent.interactionAnalytics}
                  onChange={(e) => handleConsentChange('interactionAnalytics', e.target.checked)}
                  className="mt-1 accent-[#00d4ff] w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-white">Usage &amp; interaction analytics</p>
                  <p className="text-xs text-[#9ca3c2]">
                    Allow SAVR to analyze your recipe preferences, chat interactions, and feature usage (anonymized) to improve recommendations and the AI assistant.
                  </p>
                </div>
              </label>

              {consent.consentDate && (
                <p className="text-xs text-[#6b7294]">Last updated: {consent.consentDate}</p>
              )}
            </div>
          )}
        </section>

        {/* Danger zone */}
        <section className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
          <h2 className="text-xl font-semibold text-red-400 mb-3">Danger zone</h2>
          <p className="mb-4 text-sm text-red-400">
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

