# Firebase Functions Gen1 → Gen2 Migration Guide

## Quick Fix for Deployment Error

If you encounter this error during deployment:

```
Error: [analyzeImage(us-central1)] Upgrading from 1st Gen to 2nd Gen is not yet supported.
```

**Run this command before deploying:**

```bash
firebase functions:delete analyzeImage --region us-central1 --force
```

Then deploy normally:

```bash
npm run deploy
```

## Complete Migration Process

### Step 1: Identify Gen1 Functions

Check your Firebase Console to see which functions are currently deployed as Gen1.

### Step 2: Delete Gen1 Functions

Delete all Gen1 functions that have been converted to Gen2 in the codebase:

```bash
# Delete individual function
firebase functions:delete analyzeImage --region us-central1 --force

# Or delete multiple functions at once
firebase functions:delete analyzeImage createGroceryList chat stripeWebhook --region us-central1 --force
```

### Step 3: Deploy Gen2 Functions

```bash
npm run deploy
```

Or deploy only functions:

```bash
firebase deploy --only functions
```

## Current Function Status

All SAVR functions have been migrated to Gen2 in the codebase:

| Function | Status | API Version | Notes |
|----------|--------|-------------|-------|
| `analyzeImage` | ✅ Gen2 | v2/https onCall | Image ingredient extraction |
| `createGroceryList` | ✅ Gen2 | v2/https onCall | Grocery list generation |
| `chat` | ✅ Gen2 | v2/https onCall | AI chat assistant |
| `stripeWebhook` | ✅ Gen2 | v2/https onRequest | Stripe webhook handler |
| `onUserCreate` | ⚠️ Gen1 | v1/auth onCreate | Auth triggers not yet in v2 |

### Why is `onUserCreate` still Gen1?

Firebase Functions v2 does not yet support auth triggers (`onCreate`, `onDelete`). These must remain on the v1 API until Firebase releases v2 support.

## Gen2 Benefits

- **Better performance**: Longer timeouts, more memory options
- **Improved concurrency**: Better handling of concurrent requests
- **Enhanced security**: Direct Secret Manager integration
- **Cost efficiency**: More granular resource allocation

## Troubleshooting

### Function Still Showing as Gen1

If a function still appears as Gen1 after deployment:

1. Verify it was deleted: `firebase functions:list`
2. Check the region matches: `--region us-central1`
3. Clear cache: `firebase deploy --only functions --force`

### Downtime During Migration

Function deletion causes temporary downtime. To minimize impact:

1. Schedule during low-traffic periods
2. Delete and redeploy quickly (< 5 minutes typically)
3. Monitor logs: `firebase functions:log`

### Rollback Plan

If Gen2 deployment fails, you can rollback by:

1. Reverting code to Gen1 version
2. Deleting Gen2 functions
3. Redeploying Gen1 code

**Note:** Keep a backup of working Gen1 code if you need rollback capability.

## References

- [Firebase Functions v2 Migration Guide](https://firebase.google.com/docs/functions/2nd-gen-upgrade)
- [Gen2 API Documentation](https://firebase.google.com/docs/functions/callable)
- [SAVR Function Cleanup Summary](./FUNCTION_CLEANUP_SUMMARY.md)
