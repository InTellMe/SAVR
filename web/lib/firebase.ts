import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

// Build-safe Firebase configuration
// During Next.js static export/prerendering, environment variables may not be available
// Use dummy config to prevent build crashes during prerendering.
// If Firebase config is missing in production, use dummy config and log warning instead of crashing.
const BUILD_DUMMY_KEY = 'dummy_key_for_build';

// Allow dummy config during build/prerendering phase OR development OR when no real config exists
// We detect build time by checking if we're server-side (no window) and no real Firebase env vars are set
const isServerSide = typeof window === 'undefined';
const isDevelopment = process.env.NODE_ENV === 'development';
const hasRealFirebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                               process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== BUILD_DUMMY_KEY;

// In production, if no real config exists, allow dummy config but warn
// This prevents the app from crashing if environment variables weren't injected during build
const ALLOW_DUMMY_CONFIG = isDevelopment || !hasRealFirebaseConfig;

// Track if we're using dummy config in production (for warning message)
let usingDummyConfigInProduction = false;

const getFirebaseConfigValue = (
  value: string | undefined,
  fallback: string,
  label: string
): string => {
  if (value && value !== BUILD_DUMMY_KEY) {
    return value;
  }

  if (ALLOW_DUMMY_CONFIG) {
    // If we're in production client-side without real config, mark for warning
    if (!isDevelopment && !isServerSide && !hasRealFirebaseConfig) {
      usingDummyConfigInProduction = true;
    }
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

  // Warn if running in production with dummy config
  if (usingDummyConfigInProduction) {
    console.warn(
      '⚠️ FIREBASE CONFIGURATION WARNING: Running with dummy Firebase configuration in production.\n' +
      'Firebase environment variables (NEXT_PUBLIC_FIREBASE_*) were not set during the build process.\n' +
      'Firebase features will not work until the app is rebuilt with proper configuration.\n' +
      'For deployment instructions, see DEPLOYMENT.md or contact support.'
    );
  }
} catch (error) {
  // During build time with dummy config, services may fail to initialize properly
  // This is expected and will work correctly at runtime with real config
  console.warn('Firebase initialization warning (expected during build):', error);
  
  // Re-throw in production if we have real credentials but still failed
  if (
    hasRealFirebaseConfig &&
    !isDevelopment &&
    !isServerSide
  ) {
    throw error;
  }
}

export { app, auth, db, storage, functions };
