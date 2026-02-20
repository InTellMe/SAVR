# Deployment Warnings and Errors - Resolution Summary

**Date:** February 13, 2026  
**Issue:** Multiple warnings and critical error during Firebase deployment  
**Status:** ✅ Resolved with documentation and migration guide

## Problems Identified

### 1. ⚠️ Next.js Multiple Lockfiles Warning (RESOLVED)

**Error Message:**
```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
 We detected multiple lockfiles and selected the directory of C:\Users\brand\package-lock.json as the root directory.
```

**Root Cause:**
SAVR is a monorepo with 4 separate `package-lock.json` files:
- `/package-lock.json` (root)
- `/web/package-lock.json`
- `/functions/package-lock.json`
- `/mobile/package-lock.json`

Next.js 16 was unable to determine the correct workspace root automatically.

**Solution Applied:**
Added explicit `turbopack.root` configuration to `/web/next.config.ts`:

```typescript
import path from "path";

const nextConfig: NextConfig = {
  // ... other config
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};
```

**Verification:**
✅ Build tested successfully with no lockfile warnings  
✅ All 23 static pages generated without issues  
✅ Warning completely eliminated

---

### 2. ⚠️ MetadataLookupWarning (DOCUMENTED - HARMLESS)

**Warning Message:**
```
(node:45436) MetadataLookupWarning: received unexpected error = All promises were rejected code = UNKNOWN
```

**Root Cause:**
Firebase Functions deployment attempts to fetch metadata from Google Cloud Metadata Service when running locally. This service is only available in Google Cloud environments (Cloud Functions, Cloud Run, etc.), not on local development machines.

**Impact:**
- ✅ Harmless warning - does not affect deployment success
- ✅ Does not appear in CI/CD or Cloud Build environments
- ✅ Can be safely ignored

**Optional Suppression:**
If desired, warning can be suppressed using:
```bash
NODE_OPTIONS="--no-warnings" npm run deploy
```

**Documentation:**
Added to `DEPLOYMENT_TROUBLESHOOTING.md` section 3

---

### 3. 🔴 Firebase Gen1 to Gen2 Migration Error (CRITICAL - REQUIRES USER ACTION)

**Error Message:**
```
Error: [analyzeImage(us-central1)] Upgrading from 1st Gen to 2nd Gen is not yet supported. 
See https://firebase.google.com/docs/functions/2nd-gen-upgrade before migrating to 2nd Gen.
```

**Root Cause:**
- All SAVR Cloud Functions have been migrated to Gen2 in the codebase
- However, Firebase Cloud Platform still has Gen1 versions deployed
- Firebase **does not support automatic in-place upgrades** from Gen1 to Gen2
- Manual deletion of Gen1 functions is required before deploying Gen2 versions

**Functions Affected:**
| Function | Codebase Status | Deployed Status | Action Required |
|----------|----------------|-----------------|-----------------|
| `analyzeImage` | ✅ Gen2 (v2/https onCall) | ❌ Gen1 | Delete & Redeploy |
| `createGroceryList` | ✅ Gen2 (v2/https onCall) | ❌ Gen1 | Delete & Redeploy |
| `chat` | ✅ Gen2 (v2/https onCall) | ❌ Gen1 | Delete & Redeploy |
| `stripeWebhook` | ✅ Gen2 (v2/https onRequest) | ❌ Gen1 | Delete & Redeploy |
| `onUserCreate` | ℹ️ Gen1 (v1/auth onCreate) | ✅ Gen1 | No action needed |

**Note:** `onUserCreate` correctly uses Gen1 API because Firebase Functions v2 does not yet support auth triggers.

---

## Solution for User

### Quick Migration Command

We've added a new npm script for easy migration:

```bash
npm run deploy:migrate-gen2
```

This command will:
1. Delete all Gen1 functions from Firebase
2. Deploy the new Gen2 versions

### Manual Migration Steps

If you prefer manual control:

1. **Delete Gen1 functions:**
   ```bash
   firebase functions:delete analyzeImage createGroceryList chat stripeWebhook --region us-central1 --force
   ```

2. **Deploy Gen2 functions:**
   ```bash
   npm run deploy
   ```

### Important Warnings

⚠️ **Downtime Alert:** Deleting functions causes temporary downtime (typically 2-5 minutes)  
⚠️ **Schedule Maintenance:** Consider deploying during low-traffic periods  
⚠️ **One-Time Process:** This migration is only needed once

---

## Documentation Created

### 1. FIREBASE_FUNCTIONS_MIGRATION.md
Complete guide to Gen1→Gen2 migration including:
- Quick fix commands
- Detailed migration process
- Function status table
- Troubleshooting tips
- Rollback procedures

### 2. DEPLOYMENT_TROUBLESHOOTING.md (Updated)
Added sections for all three issues:
- Section 1: Gen1→Gen2 migration error
- Section 2: Next.js lockfile warning
- Section 3: MetadataLookupWarning

### 3. README.md (Updated)
Added deployment warnings section with:
- Reference to migration guide
- Quick fix command
- Link to troubleshooting guide

### 4. package.json (Updated)
Added new script:
```json
"deploy:migrate-gen2": "firebase functions:delete analyzeImage createGroceryList chat stripeWebhook --region us-central1 --force && firebase deploy --only functions"
```

---

## Verification Status

| Issue | Status | Verification |
|-------|--------|--------------|
| Next.js lockfile warning | ✅ Fixed | Build tested - no warnings |
| MetadataLookupWarning | ✅ Documented | Known harmless issue |
| Gen1→Gen2 migration | ⚠️ User Action Required | Migration guide created |

---

## Next Steps for User

1. **Review the migration guide:** [FIREBASE_FUNCTIONS_MIGRATION.md](FIREBASE_FUNCTIONS_MIGRATION.md)

2. **Schedule maintenance window** (optional but recommended)

3. **Run migration command:**
   ```bash
   npm run deploy:migrate-gen2
   ```

4. **Monitor deployment:**
   ```bash
   firebase functions:log --only analyzeImage,createGroceryList,chat,stripeWebhook
   ```

5. **Verify functions are live:**
   - Check Firebase Console > Functions
   - Test a function call from the web app
   - Confirm all functions show as "2nd gen"

---

## Benefits of Gen2 Migration

- ✅ **Better Performance:** Longer timeouts, faster cold starts
- ✅ **More Memory Options:** Up to 16GB RAM (vs 8GB in Gen1)
- ✅ **Enhanced Security:** Direct Secret Manager integration
- ✅ **Improved Concurrency:** Better handling of concurrent requests
- ✅ **Cost Efficiency:** More granular resource allocation

---

## Support

If you encounter issues during migration:
- Review: [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md)
- Check logs: `firebase functions:log`
- Debug mode: `firebase deploy --debug`
- Contact: GooseyPrime development team

---

## References

- [Firebase Functions Gen2 Migration Guide](https://firebase.google.com/docs/functions/2nd-gen-upgrade)
- [Next.js Turbopack Configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack)
- [SAVR Function Cleanup Summary](./FUNCTION_CLEANUP_SUMMARY.md)
