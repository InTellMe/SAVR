# Authentication Error 400 Fix

## Issue
PR #39 addressed Firebase authentication 400 errors that occurred when the web application was deployed to production with missing or invalid Firebase configuration.

## Root Cause
The previous implementation in `web/lib/firebase.ts` allowed dummy Firebase configuration values during build time to prevent build failures. However, this same dummy config was being used in production deployments, causing authentication failures with HTTP 400 errors.

## Solution
Enhanced the Firebase configuration initialization to:

1. **Environment-aware validation**: Check `NODE_ENV` to determine if dummy config is acceptable
2. **Production enforcement**: Throw clear errors in production when Firebase config is missing
3. **Development flexibility**: Continue to allow dummy config for local development and builds

## Changes Made

### New Helper Function
```typescript
const getFirebaseConfigValue = (
  value: string | undefined,
  fallback: string,
  label: string
): string => {
  // Use real value if provided
  if (value && value !== BUILD_DUMMY_KEY) {
    return value;
  }

  // Allow dummy config in development
  if (ALLOW_DUMMY_CONFIG) {
    return fallback;
  }

  // Reject missing config in production
  throw new Error(
    `Missing Firebase configuration for ${label}. ` +
      'Set NEXT_PUBLIC_FIREBASE_* environment variables for production builds.'
  );
};
```

### Environment Detection
```typescript
const ALLOW_DUMMY_CONFIG = process.env.NODE_ENV !== 'production';
```

## Impact

### Before
- ❌ Production deployments could use dummy Firebase config
- ❌ Authentication requests failed with 400 errors
- ❌ No clear error messages about missing config
- ❌ Silent failures that were hard to debug

### After
- ✅ Production requires valid Firebase configuration
- ✅ Clear error messages when config is missing
- ✅ Development builds continue to work with dummy config
- ✅ Authentication works correctly in production

## Verification

To verify the fix works correctly:

1. **Development Build** (should succeed with dummy config):
```bash
cd web
NODE_ENV=development npm run build
```

2. **Production Build without Config** (should fail with clear error):
```bash
cd web
NODE_ENV=production npm run build
```

3. **Production Build with Config** (should succeed):
```bash
cd web
export NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-domain"
# ... set all other NEXT_PUBLIC_FIREBASE_* variables
NODE_ENV=production npm run build
```

## Related Files
- `web/lib/firebase.ts` - Main Firebase initialization
- `.env.example` - Environment variable template
- `DEPLOYMENT.md` - Deployment instructions including environment setup

## Notes
- This fix was implemented in PR #39 from the `codex/investigate-authentication-error-400` branch
- The same pattern should be used for mobile app Firebase initialization (`mobile/src/config/firebase.ts`)
- All Firebase environment variables must be set in production deployments (Vercel, Firebase Hosting, etc.)
