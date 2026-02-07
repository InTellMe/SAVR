import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import Constants from 'expo-constants';

// Build-safe Firebase configuration
// During EAS Build or local builds, environment variables may not be available
// Use dummy config to prevent build crashes
const BUILD_DUMMY_KEY = 'dummy_key_for_build';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || BUILD_DUMMY_KEY,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || 'dummy.firebaseapp.com',
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || 'dummy-project',
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || 'dummy.appspot.com',
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || '123456789',
  appId: Constants.expoConfig?.extra?.firebaseAppId || '1:123456789:app:abc123',
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
  
  // Re-throw only if we're in runtime with real credentials
  const hasRealConfig = Constants.expoConfig?.extra?.firebaseApiKey && 
                        Constants.expoConfig?.extra?.firebaseApiKey !== BUILD_DUMMY_KEY;
  
  // Check if we're in a real runtime environment (not build time)
  const isRuntime = typeof global !== 'undefined' && global.performance;
  
  if (isRuntime && hasRealConfig) {
    throw error;
  }
}

export { app, auth, db, storage, functions };
