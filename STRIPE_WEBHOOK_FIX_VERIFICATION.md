# Stripe Webhook Fix - Verification Guide

## Summary of Changes

This fix addresses the critical issue where Stripe subscriptions are successfully paid but not recognized by the app. The root causes were:

1. **Function Entry Point Hijacking** - Container reuse between services caused webhooks to return 200 OK without executing subscription code
2. **Missing High-Visibility Logging** - No clear indication in logs when webhook was executing
3. **Race Condition Risk** - Frontend could potentially overwrite webhook updates

## Changes Implemented

### 1. Firebase Function Codebase Isolation (`firebase.json`)

**Before:**
```json
"functions": {
  "source": "functions",
  "runtime": "nodejs22",
  "predeploy": [...]
}
```

**After:**
```json
"functions": [
  {
    "source": "functions",
    "codebase": "stripe-billing-service",
    "runtime": "nodejs22",
    "ignore": ["node_modules", ".git", "firebase-debug.log"],
    "predeploy": [...]
  }
]
```

**Impact:** Prevents container reuse between different Firebase Functions, ensuring the Stripe webhook function has its own isolated runtime.

### 2. Enhanced Webhook Logging and Atomic Updates (`functions/src/services/stripe.ts`)

**Key Changes:**
- Added high-visibility log at function entry: `console.log("!!! WEBHOOK EXECUTING !!! UID:", session.client_reference_id)`
- Moved subscription status determination BEFORE immediate write
- Changed from `.update()` to `.set()` with `{ merge: true }`
- Immediately writes `stripeCustomerId`, `subscriptionStatus`, and `subscriptionTier` atomically

**Code:**
```typescript
console.log("!!! WEBHOOK EXECUTING !!! UID:", session.client_reference_id);

// ... determine subscription status and tier first ...

await db.collection('users').doc(userId).set({
  stripeCustomerId,
  stripeEmail: sessionEmail,
  subscriptionStatus: status,  // ← Now written immediately
  subscriptionTier: tier,      // ← Now written immediately
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}, { merge: true });  // ← Using merge instead of update
```

**Impact:** 
- Subscription is activated immediately in a single atomic operation
- Using `merge: true` prevents errors if document is in unexpected state
- Prevents race conditions with frontend

### 3. Frontend Protection Verification (`web/contexts/AuthContext.tsx`)

**Existing Protection (Verified Correct):**
```typescript
const userDoc = await getDoc(userDocRef);
if (!userDoc.exists()) {
  // Only create for new users
  await setDoc(userDocRef, {...});
}
// If user exists, do NOT update - let webhook handle subscription status
```

**Impact:** Frontend never overwrites existing subscription data, eliminating race condition risk.

### 4. Configuration Verification (`web/next.config.ts`)

**Verified Correct:**
```typescript
trailingSlash: false
```

**Impact:** Prevents white screen issues during navigation.

## Verification Checklist

### Pre-Deployment Checks
- [x] `firebase.json` uses array format with explicit codebase
- [x] High-visibility log added to webhook function
- [x] Subscription status written immediately with merge
- [x] Frontend has protection against overwrites
- [x] `trailingSlash: false` is set
- [x] Webhook export name (`stripeWebhook`) matches configuration
- [x] Linting passes (3 warnings in unrelated files)
- [x] Build completes successfully
- [x] CodeQL security scan shows no vulnerabilities

### Post-Deployment Testing

#### 1. Monitor Cloud Logs for New High-Visibility Logging

After deploying, check Firebase Functions logs:

```bash
firebase functions:log --only stripeWebhook
```

**What to Look For:**
```
!!! WEBHOOK EXECUTING !!! UID: jOLAhuqO8zRHEOVpYeFqDFRNnJg1
🔗 Immediately linking Stripe customer cus_xxx to user jOLAhuqO8zRHEOVpYeFqDFRNnJg1 with status active
✅ Stripe customer ID and subscription status linked to user document
```

The `!!! WEBHOOK EXECUTING !!!` log should appear IMMEDIATELY when a webhook is received, confirming the function is actually executing.

#### 2. Test Subscription Flow

**Option A: Live Test (Recommended)**
1. Sign up with a test account
2. Navigate to pricing page
3. Select a plan and complete checkout using test card `4242 4242 4242 4242`
4. Immediately check Firestore console for user document
5. Verify `subscriptionStatus` changes from `pending` to `active` or `trialing`
6. Check Firebase logs for the high-visibility log message

**Option B: Webhook Simulation**
1. Use Stripe CLI to forward webhooks to local emulator:
   ```bash
   stripe listen --forward-to localhost:5001/your-project/us-central1/stripeWebhook
   ```
2. Trigger a test checkout session completed event:
   ```bash
   stripe trigger checkout.session.completed
   ```
3. Check emulator logs for `!!! WEBHOOK EXECUTING !!!`
4. Verify Firestore document is updated

#### 3. Verify No Race Conditions

**Test Steps:**
1. Complete a checkout
2. Immediately refresh the app multiple times
3. Check that subscription status remains `active`/`trialing` (not reset to `pending`)
4. Verify frontend doesn't overwrite webhook updates

**Expected Result:** Status should remain stable even with multiple page refreshes immediately after checkout.

#### 4. Check Webhook Delivery in Stripe Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Find recent `checkout.session.completed` events
4. Verify they show successful delivery (200 OK response)
5. Check response time - should be < 5 seconds

## Troubleshooting

### Issue: Still seeing "Ghost Function" behavior

**Symptoms:**
- Stripe shows 200 OK
- No `!!! WEBHOOK EXECUTING !!!` log appears
- Subscription status stays `pending`

**Solution:**
1. Verify firebase.json was deployed correctly: `firebase deploy --only hosting:config`
2. Redeploy functions: `firebase deploy --only functions`
3. Clear any cached containers: Delete and redeploy the function
4. Check that codebase name is consistent across configuration

### Issue: Webhook logs show execution but status doesn't update

**Symptoms:**
- `!!! WEBHOOK EXECUTING !!!` log appears
- Other validation logs show success
- Firestore document still shows `pending`

**Solution:**
1. Check for errors after the immediate write
2. Verify Firestore security rules allow webhook function to write
3. Check that `client_reference_id` is being passed correctly from frontend
4. Use `/subscription-debug` page to see current values

### Issue: Frontend still overwriting webhook updates

**Symptoms:**
- Webhook sets status to `active`
- Frontend immediately resets it to `pending`

**Solution:**
1. Verify AuthContext.tsx changes are deployed to web app
2. Check browser console for any errors
3. Clear browser cache and hard refresh
4. Rebuild and redeploy web app: `cd web && npm run build`

## Success Criteria

The fix is successful when:

1. ✅ Every webhook execution shows `!!! WEBHOOK EXECUTING !!!` in logs
2. ✅ Subscription status changes from `pending` to `active`/`trialing` within 5 seconds of checkout
3. ✅ Status remains stable (no race condition resets)
4. ✅ Stripe Dashboard shows 200 OK responses for all webhooks
5. ✅ User can immediately access paid features after checkout
6. ✅ `/subscription-debug` page shows correct subscription data

## Rollback Plan

If issues occur after deployment:

1. Revert firebase.json to object format (not recommended, but safe):
   ```bash
   git revert <commit-hash>
   firebase deploy --only hosting:config,functions
   ```

2. Monitor for webhook delivery failures in Stripe Dashboard

3. If reverting doesn't help, the issue is likely unrelated to this change

## Additional Resources

- [WEBHOOK_DEBUGGING_GUIDE.md](./WEBHOOK_DEBUGGING_GUIDE.md) - Complete webhook debugging documentation
- [STRIPE_TRIAL_LIFECYCLE.md](./STRIPE_TRIAL_LIFECYCLE.md) - Trial period flow documentation
- Stripe Dashboard: https://dashboard.stripe.com/webhooks
- Firebase Console: https://console.firebase.google.com/

## Contact

For issues or questions about this fix, refer to the problem statement or check the PR discussion.
