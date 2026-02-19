'use client';

import { useAuth, isProTier, hasActiveSubscription } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const CHECKOUT_GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Check if user recently initiated a Stripe checkout (localStorage fallback).
 * The Stripe Pricing Table's redirect URL is configured in the Stripe Dashboard
 * and may not include ?stripeSuccess=true. This localStorage flag lets us detect
 * that the user was on the pricing page and may be returning from checkout.
 */
function hasRecentCheckoutIntent(): boolean {
  try {
    const pending = localStorage.getItem('savr_checkout_pending');
    if (!pending) return false;
    const elapsed = Date.now() - parseInt(pending, 10);
    return elapsed >= 0 && elapsed < CHECKOUT_GRACE_PERIOD_MS;
  } catch {
    return false;
  }
}

export default function ProtectedRoute({
  children,
  requirePro = false,
}: {
  children: React.ReactNode;
  requirePro?: boolean;
}) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isActive = hasActiveSubscription(userData);
  const hasPro = isProTier(userData?.subscriptionTier);

  // Check if user is returning from successful Stripe checkout
  const isReturningFromStripe = searchParams.get('stripeSuccess') === 'true';

  // Also check localStorage for checkout intent (fallback when Stripe redirect
  // URL doesn't include ?stripeSuccess=true)
  const [hasCheckoutIntent, setHasCheckoutIntent] = useState(false);
  useEffect(() => {
    setHasCheckoutIntent(hasRecentCheckoutIntent());
  }, []);

  // Grace period: allow access if user just came from Stripe checkout
  const inGracePeriod = isReturningFromStripe || hasCheckoutIntent;

  // Clear checkout intent once subscription activates (webhook processed)
  useEffect(() => {
    if (isActive && hasCheckoutIntent) {
      try {
        localStorage.removeItem('savr_checkout_pending');
      } catch {
        // non-critical
      }
      setHasCheckoutIntent(false);
    }
  }, [isActive, hasCheckoutIntent]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/sign-in');
      } else if (!isActive && !inGracePeriod) {
        // User hasn't completed Stripe onboarding — send to pricing
        // BUT allow access if they just successfully paid (grace period for webhook processing)
        router.push('/pricing');
      } else if (requirePro && !hasPro) {
        router.push('/pricing');
      }
    }
  }, [user, userData, loading, router, requirePro, hasPro, isActive, inGracePeriod]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d4ff]"></div>
      </div>
    );
  }

  if (!user || (!isActive && !inGracePeriod) || (requirePro && !hasPro)) {
    return null;
  }

  return <>{children}</>;
}
