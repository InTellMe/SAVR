import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

// Build-safe Firebase configuration
// During Next.js static export/prerendering, environment variables may not be available
// Use dummy config to prevent build crashes during prerendering, but validate at runtime.
const BUILD_DUMMY_KEY = 'dummy_key_for_build';

// Allow dummy config during build/prerendering phase OR development
// During Next.js build, we're prerendering static pages - this is NOT production runtime
const isBuildTime = typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build';
const isDevelopment = process.env.NODE_ENV === 'development';
const ALLOW_DUMMY_CONFIG = isBuildTime || isDevelopment;

const getFirebaseConfigValue = (
  value: string | undefined,
  fallback: string,
  label: string
): string => {
  if (value && value !== BUILD_DUMMY_KEY) {
    return value;
  }

  if (ALLOW_DUMMY_CONFIG) {
    return fallback;
  }

  throw new Error(
    `Missing Firebase configuration for ${label}. ` +
      'Set NEXT_PUBLIC_FIREBASE_* environment variables for production builds.'
  );
};

const firebaseConfig = {
  apiKey: getFirebaseConfigValue(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    BUILD_DUMMY_KEY,
    'NEXT_PUBLIC_FIREBASE_API_KEY'
  ),
  authDomain: getFirebaseConfigValue(
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    'dummy.firebaseapp.com',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'
  ),
  projectId: getFirebaseConfigValue(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    'dummy-project',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ),
  storageBucket: getFirebaseConfigValue(
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    'dummy.appspot.com',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
  ),
  messagingSenderId: getFirebaseConfigValue(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    '123456789',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  ),
  appId: getFirebaseConfigValue(
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    '1:123456789:web:abc123',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ),
};

// Initialize Firebase with build-safe guard
// Using definite assignment assertion (!) because initialization always happens in try block
let app!: FirebaseApp;
let auth!: Auth;
let db!: Firestore;
let storage!: FirebaseStorage;
let functions!: Functions;

try {
  // Only initialize if not already initialized
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
} catch (error) {
  // During build time with dummy config, services may fail to initialize properly
  // This is expected and will work correctly at runtime with real config
  console.warn('Firebase initialization warning (expected during build):', error);
  
  // Re-throw in production or when real credentials are present.
  if (
    !ALLOW_DUMMY_CONFIG ||
    (process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== BUILD_DUMMY_KEY)
  ) {
    throw error;
  }
}

export { app, auth, db, storage, functions };
