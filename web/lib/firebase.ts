import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

// Build-safe Firebase configuration
// During Next.js static export/prerendering, environment variables may not be available
// Use dummy config to prevent build crashes during prerendering.
const BUILD_DUMMY_KEY = 'dummy_key_for_build';

const isServerSide = typeof window === 'undefined';
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const hasRealFirebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                               process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== BUILD_DUMMY_KEY;

// PRODUCTION BUILDS REQUIRE REAL FIREBASE CONFIG
// Fail immediately during production build if Firebase environment variables are missing
if (isProduction && isServerSide && !hasRealFirebaseConfig) {
  throw new Error(
    '\n\n' +
    '═'.repeat(80) + '\n' +
    '❌ FIREBASE CONFIGURATION ERROR: Production build requires Firebase credentials\n' +
    '═'.repeat(80) + '\n' +
    'Firebase environment variables (NEXT_PUBLIC_FIREBASE_*) are REQUIRED for production builds.\n' +
    'These variables must be set during the build process to be baked into static files.\n\n' +
    'Missing or invalid: NEXT_PUBLIC_FIREBASE_API_KEY\n\n' +
    'For deployment instructions, see DEPLOYMENT.md\n' +
    'For CI/CD setup, ensure GitHub Secrets are configured in firebase-deploy.yml\n' +
    '═'.repeat(80) + '\n'
  );
}

// Allow dummy config ONLY in development
const ALLOW_DUMMY_CONFIG = isDevelopment;

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
    `❌ FIREBASE CONFIGURATION ERROR: Missing ${label}.\n` +
      'Production builds REQUIRE Firebase environment variables to be set during build.\n' +
      'NEXT_PUBLIC_FIREBASE_* environment variables were not provided.\n' +
      'For deployment instructions, see DEPLOYMENT.md or contact support.'
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
  
  // Re-throw in production client-side if initialization fails with real credentials
  if (
    hasRealFirebaseConfig &&
    !isDevelopment &&
    !isServerSide
  ) {
    throw error;
  }
}

export { app, auth, db, storage, functions };
