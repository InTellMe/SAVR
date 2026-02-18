'use client';

import { useAuth, isProTier, hasActiveSubscription } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

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

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/sign-in');
      } else if (!isActive && !isReturningFromStripe) {
        // User hasn't completed Stripe onboarding — send to pricing
        // BUT allow access if they just successfully paid (grace period for webhook processing)
        router.push('/pricing');
      } else if (requirePro && !hasPro) {
        router.push('/pricing');
      }
    }
  }, [user, userData, loading, router, requirePro, hasPro, isActive, isReturningFromStripe]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d4ff]"></div>
      </div>
    );
  }

  if (!user || (!isActive && !isReturningFromStripe) || (requirePro && !hasPro)) {
    return null;
  }

  return <>{children}</>;
}
