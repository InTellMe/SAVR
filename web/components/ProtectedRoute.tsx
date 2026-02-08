'use client';

import { useAuth, isPaidTier, hasActiveSubscription } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
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
  const hasPaidTier = isPaidTier(userData?.subscriptionTier);
  const isActive = hasActiveSubscription(userData);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/sign-in');
      } else if (!isActive) {
        // User hasn't completed Stripe onboarding — send to pricing
        router.push('/pricing');
      } else if (requirePro && !hasPaidTier) {
        router.push('/pricing');
      }
    }
  }, [user, userData, loading, router, requirePro, hasPaidTier, isActive]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d4ff]"></div>
      </div>
    );
  }

  if (!user || !isActive || (requirePro && !hasPaidTier)) {
    return null;
  }

  return <>{children}</>;
}
