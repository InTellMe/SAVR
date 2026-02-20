import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Build-safe Supabase configuration
// During EAS Build or local builds, environment variables may not be available
// Use dummy config to prevent build crashes
const BUILD_DUMMY_KEY = 'dummy_key_for_build';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://dummy.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || BUILD_DUMMY_KEY;

const hasRealConfig = supabaseUrl !== 'https://dummy.supabase.co' && 
                      supabaseAnonKey !== BUILD_DUMMY_KEY;

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not relevant for mobile
  },
});

// Warn if running with dummy config
if (!hasRealConfig && __DEV__) {
  console.warn(
    '⚠️ Supabase running with dummy config. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in app.config.ts'
  );
}
