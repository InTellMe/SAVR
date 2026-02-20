import { createClient } from '@supabase/supabase-js';

// Build-safe Supabase configuration
// During Next.js static export/prerendering, environment variables may not be available
// Use dummy config to prevent build crashes during prerendering.
const BUILD_DUMMY_KEY = 'dummy_key_for_build';

const isServerSide = typeof window === 'undefined';
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Check required Supabase environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const hasRealSupabaseConfig = supabaseUrl && 
                               supabaseUrl !== BUILD_DUMMY_KEY &&
                               supabaseAnonKey && 
                               supabaseAnonKey !== BUILD_DUMMY_KEY;

// PRODUCTION BUILDS: warn about missing Supabase config but allow static export prerendering
if (isProduction && isServerSide && !hasRealSupabaseConfig) {
  console.warn(
    '\n⚠ Supabase env vars missing during build — using dummy config for prerender.\n' +
    '  Missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
    '  Client-side Supabase calls will fail until env vars are provided.\n'
  );
}

// CLIENT-SIDE RUNTIME CHECK: Prevent app from running with dummy config in production browser
if (isProduction && !isServerSide && !hasRealSupabaseConfig) {
  throw new Error(
    '\n\n' +
    '═'.repeat(80) + '\n' +
    '❌ SUPABASE RUNTIME ERROR: Production app running with invalid Supabase credentials\n' +
    '═'.repeat(80) + '\n' +
    'The app was built without proper Supabase environment variables.\n' +
    'This should not happen if the build validation is working correctly.\n\n' +
    'Missing or invalid variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n' +
    'The app must be rebuilt with proper Supabase credentials.\n' +
    'For deployment instructions, see SUPABASE_SETUP.md\n' +
    '═'.repeat(80) + '\n'
  );
}

// Allow dummy config in development and during server-side prerendering (static export build)
const ALLOW_DUMMY_CONFIG = isDevelopment || isServerSide;

const getSupabaseConfigValue = (
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
    `❌ SUPABASE CONFIGURATION ERROR: Missing ${label}.\n` +
      'Production builds REQUIRE Supabase environment variables to be set during build.\n' +
      'NEXT_PUBLIC_SUPABASE_* environment variables were not provided.\n' +
      'For deployment instructions, see SUPABASE_SETUP.md or contact support.'
  );
};

const supabaseUrlValue = getSupabaseConfigValue(
  supabaseUrl,
  'https://dummy.supabase.co',
  'NEXT_PUBLIC_SUPABASE_URL'
);

const supabaseAnonKeyValue = getSupabaseConfigValue(
  supabaseAnonKey,
  BUILD_DUMMY_KEY,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
);

// Create Supabase client
export const supabase = createClient(supabaseUrlValue, supabaseAnonKeyValue, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
