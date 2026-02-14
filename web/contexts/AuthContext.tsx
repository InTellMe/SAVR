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
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type SubscriptionTierName = 'basic' | 'pro';

interface UserData {
  uid: string;
  email: string | null;
  displayName?: string | null;
  subscriptionTier: SubscriptionTierName | 'free' | 'plus' | 'premium'; // legacy: free/plus/premium from Firestore
  subscriptionStatus?: string;
  stripeCustomerId?: string;
}

export function isProTier(tier: UserData['subscriptionTier'] | undefined): boolean {
  return tier === 'pro' || tier === 'plus' || tier === 'premium';
}

export function isPaidTier(tier: UserData['subscriptionTier'] | undefined): boolean {
  // All tiers are now paid (basic and pro) — this checks if user has ANY tier set
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
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      // Clean up previous Firestore listener when user changes
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);

        // Ensure the user document exists (first sign-up)
        try {
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            const newUserData: UserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              subscriptionTier: 'basic',
              subscriptionStatus: 'pending',
            };
            await setDoc(userDocRef, {
              ...newUserData,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Failed to ensure user document exists:', error);
        }

        // Listen for real-time updates so webhook changes (subscription activation,
        // upgrades, cancellations) are reflected immediately without a page refresh.
        unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              setUserData(snapshot.data() as UserData);
            } else {
              setUserData({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                subscriptionTier: 'basic',
                subscriptionStatus: 'pending',
              });
            }
            setLoading(false);
          },
          (error) => {
            console.error('Firestore snapshot error:', error);
            setUserData({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              subscriptionTier: 'basic',
              subscriptionStatus: 'pending',
            });
            setLoading(false);
          }
        );
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
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
