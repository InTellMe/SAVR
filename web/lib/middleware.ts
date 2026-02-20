import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  );
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  
  return { user, supabase };
}

export async function checkRateLimit(userId: string, endpoint: string, limit: number, windowMs: number) {
  // TODO: Implement proper rate limiting using Supabase or Redis
  // For now, simplified version that always allows
  return { allowed: true };
}

export async function checkSubscriptionTier(userId: string, requiredTier: 'basic' | 'pro') {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .single();
  
  if (!user) return false;
  
  if (requiredTier === 'pro') {
    return (user.subscription_tier === 'pro' || user.subscription_tier === 'plus' || user.subscription_tier === 'premium') &&
           (user.subscription_status === 'active' || user.subscription_status === 'trialing');
  }
  
  return true;
}
