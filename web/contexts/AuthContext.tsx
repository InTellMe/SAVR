'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type SubscriptionTierName = 'basic' | 'pro';

interface UserData {
  uid: string;
  email: string | null;
  displayName?: string | null;
  subscriptionTier: SubscriptionTierName | 'free' | 'plus' | 'premium'; // legacy: free/plus/premium from Firestore
  subscriptionStatus?: string;
}

export function isPaidTier(tier: UserData['subscriptionTier'] | undefined): boolean {
  // All tiers are now paid (basic and pro)
  return tier === 'basic' || tier === 'pro' || tier === 'plus' || tier === 'premium' || tier === 'free';
}

export function hasActiveSubscription(userData: UserData | null): boolean {
  if (!userData) return false;
  // User must have completed Stripe onboarding (status is 'active' or 'trialing')
  const status = userData.subscriptionStatus;
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        // Fetch user data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          } else {
            // Initialize user document with pending status — user must complete Stripe onboarding.
            // Uses 'basic' tier and 'pending' status to match Firestore security rules.
            const newUserData: UserData = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              subscriptionTier: 'basic',
              subscriptionStatus: 'pending',
            };
            await setDoc(userDocRef, {
              ...newUserData,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            setUserData(newUserData);
          }
        } catch (error) {
          console.error('Failed to fetch or create user document:', error);
          // Use in-memory fallback so UI can still redirect to pricing
          setUserData({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            subscriptionTier: 'basic',
            subscriptionStatus: 'pending',
          });
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    await signInWithPopup(auth, provider);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
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
