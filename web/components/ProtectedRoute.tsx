'use client';

import { useAuth, isPaidTier } from '@/contexts/AuthContext';
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

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/sign-in');
      } else if (requirePro && !hasPaidTier) {
        router.push('/pricing');
      }
    }
  }, [user, userData, loading, router, requirePro, hasPaidTier]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user || (requirePro && !hasPaidTier)) {
    return null;
  }

  return <>{children}</>;
}
