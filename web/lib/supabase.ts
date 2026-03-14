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

// CLIENT-SIDE RUNTIME CHECK: Warn if running with dummy config in production browser
if (isProduction && !isServerSide && !hasRealSupabaseConfig) {
  console.error(
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

// Allow dummy config in development, server-side, CI/test builds where envs may be intentionally dummy.
const isCI = process.env.CI === 'true';
const isTestEnv = process.env.NODE_ENV === 'test';
const ALLOW_DUMMY_CONFIG = isDevelopment || isServerSide || isCI || isTestEnv;

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

  // In production client-side with missing config, use fallback so the module still loads.
  // The error has already been logged above; throwing here would crash the module on import.
  if (!hasRealSupabaseConfig) {
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

// Admin client with service role key (lazy initialization for server-side only)
let supabaseAdminInstance: any = null;

/**
 * Get or create a Supabase admin client with service role key.
 * This provides elevated privileges for server-side operations.
 * Uses lazy initialization to prevent build-time errors.
 * 
 * @throws {Error} If SUPABASE_SERVICE_ROLE_KEY is not set at runtime
 * @returns {SupabaseClient} Supabase client with service role privileges
 */
export function getSupabaseAdmin(): any {
  // Return cached instance if already created
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  // Validate environment variables at runtime
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Please set this environment variable in your Vercel project settings.'
    );
  }

  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not configured. Please set this environment variable in your Vercel project settings.'
    );
  }

  // Create and cache the admin client
  supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminInstance;
}
