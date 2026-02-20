'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type SubscriptionTierName = 'basic' | 'pro';

interface UserData {
  id: string;
  email: string | null;
  display_name?: string | null;
  subscription_tier: SubscriptionTierName | 'free' | 'plus' | 'premium'; // legacy: free/plus/premium
  subscription_status?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_email?: string;
  trial_ends_at?: string; // ISO date string
  trial_ending_notified?: boolean;
  current_period_end?: string; // ISO date string
  cancel_at_period_end?: boolean;
  last_payment_status?: string;
  last_payment_date?: string; // ISO date string
  payment_action_required?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function isProTier(tier: UserData['subscription_tier'] | undefined): boolean {
  return tier === 'pro' || tier === 'plus' || tier === 'premium';
}

export function isPaidTier(tier: UserData['subscription_tier'] | undefined): boolean {
  // All tiers are now paid (basic and pro) — this checks if user has ANY tier set
  return tier === 'basic' || tier === 'pro' || tier === 'plus' || tier === 'premium' || tier === 'free';
}

export function hasActiveSubscription(userData: UserData | null): boolean {
  if (!userData) return false;
  // User must have completed Stripe onboarding (status is 'active' or 'trialing')
  const status = userData.subscription_status;
  return status === 'active' || status === 'trialing';
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setUserData(null);
          setLoading(false);
        }

        // Clear checkout intent flag once subscription is confirmed active
        if (event === 'SIGNED_IN' && userData?.subscription_status === 'active' || userData?.subscription_status === 'trialing') {
          try {
            localStorage.removeItem('savr_checkout_pending');
          } catch {
            // non-critical
          }
        }
      }
    );

    // Set up realtime subscription for user data changes (webhook updates)
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = (userId: string) => {
      realtimeChannel = supabase
        .channel(`user_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            setUserData(payload.new as UserData);
            // Clear checkout intent flag once subscription is confirmed active
            const newData = payload.new as UserData;
            if (newData.subscription_status === 'active' || newData.subscription_status === 'trialing') {
              try {
                localStorage.removeItem('savr_checkout_pending');
              } catch {
                // non-critical
              }
            }
          }
        )
        .subscribe();
    };

    const fetchUserData = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
          // User might not exist yet - this is okay for new sign-ups
          // The trigger will create the user record
          setUserData(null);
        } else if (data) {
          setUserData(data as UserData);
          setupRealtimeSubscription(userId);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    return () => {
      subscription.unsubscribe();
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
