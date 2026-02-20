'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function SubscriptionDebugPage() {
  return (
    <ProtectedRoute>
      <SubscriptionDebugContent />
    </ProtectedRoute>
  );
}

function SubscriptionDebugContent() {
  const { user, userData } = useAuth();

  const formatDate = (
    date: string | Date | { seconds: number; nanoseconds: number } | undefined
  ) => {
    if (!date) return 'N/A';
    if (typeof date === 'string') {
      return new Date(date).toISOString();
    }
    if (date instanceof Date) {
      return date.toISOString();
    }
    if ('seconds' in date) {
      return new Date(date.seconds * 1000).toISOString();
    }
    return 'Invalid date';
  };

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link href="/settings" className="text-[#00d4ff] hover:underline">
              ← Back to Settings
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Subscription Debug Info</h1>
          <p className="text-[#9ca3c2] mb-8">
            Use this information when reporting subscription issues to support.
          </p>

          {/* Supabase Auth Info */}
          <div className="glass-card rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Supabase Authentication</h2>
            <div className="space-y-3">
              <InfoRow label="User ID" value={user?.id || 'N/A'} />
              <InfoRow label="Email" value={user?.email || 'N/A'} />
              <InfoRow label="Email Verified" value={user?.email_confirmed_at ? 'Yes' : 'No'} />
            </div>
          </div>

          {/* Subscription Info */}
          <div className="glass-card rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Subscription Status</h2>
            <div className="space-y-3">
              <InfoRow 
                label="Status" 
                value={userData?.subscription_status || 'pending'} 
                highlight={userData?.subscription_status === 'active' || userData?.subscription_status === 'trialing'}
              />
              <InfoRow 
                label="Tier" 
                value={userData?.subscription_tier || 'basic'} 
              />
              <InfoRow 
                label="Stripe Customer ID" 
                value={userData?.stripe_customer_id || 'Not set'} 
              />
              <InfoRow 
                label="Stripe Subscription ID" 
                value={userData?.stripe_subscription_id || 'Not set'} 
              />
              <InfoRow 
                label="Trial Ends At" 
                value={formatDate(userData?.trial_ends_at)} 
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg p-6" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
            <h3 className="text-lg font-semibold text-[#00d4ff] mb-3">Expected Values After Subscription</h3>
            <ul className="space-y-2 text-sm text-[#9ca3c2]">
              <li>• <strong>Status:</strong> Should be &quot;trialing&quot; during 5-day trial, then &quot;active&quot;</li>
              <li>• <strong>Tier:</strong> Should be &quot;basic&quot; or &quot;pro&quot; depending on plan chosen</li>
              <li>• <strong>Customer ID:</strong> Should start with &quot;cus_&quot;</li>
              <li>• <strong>Subscription ID:</strong> Should start with &quot;sub_&quot;</li>
              <li>• <strong>Trial Ends At:</strong> Should be 5 days after subscription start</li>
            </ul>
            
            <div className="mt-4 pt-4 border-t border-[#00d4ff]/20">
              <p className="text-sm text-[#9ca3c2]">
                <strong>If any values show &quot;Not set&quot; or &quot;pending&quot;:</strong>
              </p>
              <ol className="mt-2 space-y-1 text-sm text-[#9ca3c2] list-decimal list-inside">
                <li>Check Stripe Dashboard → Developers → Webhooks for delivery status</li>
                <li>Check Vercel dashboard logs for webhook errors</li>
                <li>Verify you completed checkout (not just abandoned cart)</li>
                <li>Wait 30 seconds and refresh this page</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-white/6">
      <span className="text-[#9ca3c2] text-sm">{label}</span>
      <span 
        className={`text-sm font-mono ${highlight ? 'text-[#00bfa6]' : 'text-white'} break-all max-w-[60%] text-right`}
      >
        {value}
      </span>
    </div>
  );
}
