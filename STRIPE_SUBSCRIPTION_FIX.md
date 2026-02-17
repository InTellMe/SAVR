# Stripe Subscription Recognition Fix

## Problem Statement

Users who completed Stripe checkout and paid for subscriptions were not having their subscription status recognized by the application. This resulted in:
- Subscribed users still seeing pricing tables and sign-up CTAs
- Access to paid features being blocked despite successful payment
- No indication in the UI that the subscription was active

## Root Cause Analysis

### The Race Condition

When a user completes a Stripe checkout, multiple webhook events fire in rapid succession:

1. **`customer.subscription.created`** - Fires when the subscription is created
2. **`checkout.session.completed`** - Fires when the checkout completes

These events arrive **asynchronously** and in **unpredictable order**. The race condition occurs because:

- `checkout.session.completed` handler sets `stripeCustomerId` on the user document
- `customer.subscription.created` handler looks up the user by `stripeCustomerId`
- If `subscription.created` arrives **before** `checkout.completed`, the lookup fails!

### Event Flow Diagram

#### Successful Flow (checkout arrives first):
```
1. checkout.session.completed → Sets stripeCustomerId on user doc
2. customer.subscription.created → Finds user by stripeCustomerId → Updates status
✅ User gets subscription status = 'active' or 'trialing'
```

#### Failed Flow (subscription arrives first):
```
1. customer.subscription.created → Looks for stripeCustomerId → Not found!
   ❌ Logs: "No user found for subscription..."
   ❌ Status NOT updated
2. checkout.session.completed → Sets stripeCustomerId and status
   ⚠️ But if webhook processing already finished, no retry occurs
```

### Why This Caused Persistent Issues

The `hasActiveSubscription()` function checks:
```typescript
status === 'active' || status === 'trialing'
```

If the race condition occurs:
- User document gets `stripeCustomerId` but might keep status='pending'
- Frontend sees status='pending' and treats user as non-subscriber
- Pricing CTAs continue to show
- Dashboard features remain locked

## Solution Implemented

### 1. Enhanced User Lookup (`findUserByCustomerId`)

**Before:** Only looked up users by `stripeCustomerId` field
```typescript
async function findUserByCustomerId(customerId: string) {
  const snap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1).get();
  if (snap.empty) return null;
  return { userId: snap.docs[0].id, data: snap.docs[0].data() };
}
```

**After:** Dual-strategy lookup with email fallback
```typescript
async function findUserByCustomerId(customerId: string) {
  // Strategy 1: Look up by stored customer ID (fast path)
  const snap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1).get();
  if (!snap.empty) {
    return { userId: snap.docs[0].id, data: snap.docs[0].data() };
  }

  // Strategy 2: Fetch customer email from Stripe and look up by email
  // This handles the race condition!
  const customer = await stripe.customers.retrieve(customerId);
  if (customer && !customer.deleted && customer.email) {
    const emailSnap = await db.collection('users')
      .where('email', '==', customer.email)
      .limit(1).get();
    
    if (!emailSnap.empty) {
      const userId = emailSnap.docs[0].id;
      
      // Proactively link customer ID to prevent future email lookups
      await db.collection('users').doc(userId).update({
        stripeCustomerId: customerId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return { userId, data: emailSnap.docs[0].data() };
    }
  }

  return null;
}
```

**Benefits:**
- ✅ Handles webhooks arriving in any order
- ✅ Self-healing: proactively links customer ID when found by email
- ✅ No code changes needed in webhook handlers
- ✅ Works with existing Stripe Pricing Table integration

### 2. Added Verification Logging

Added post-update verification to all critical webhook handlers:

```typescript
// After updating user subscription...
const verifyDoc = await db.collection('users').doc(userId).get();
const verifyData = verifyDoc.data();
if (verifyData?.subscriptionStatus !== expectedStatus) {
  console.error(
    `❌ CRITICAL: User ${userId} status mismatch! ` +
    `Expected: ${expectedStatus}, Got: ${verifyData?.subscriptionStatus || 'undefined'}`
  );
} else {
  console.log(`✅ Verified: User ${userId} status correctly set to '${expectedStatus}'`);
}
```

**Where Applied:**
- `handleCheckoutCompleted` (lines 563-577)
- `handleSubscriptionUpdated` (lines 636-650)
- `handlePaymentSucceeded` (lines 779-793)

**Benefits:**
- ✅ Immediately identifies if updates fail
- ✅ Helps diagnose Firestore permission issues
- ✅ Confirms subscription status is correct
- ✅ Makes debugging much easier

### 3. Improved Payment Handler

Enhanced `handlePaymentSucceeded` to ensure status is always current:
- Fetches latest subscription from Stripe
- Updates user document with current status
- Verifies the update succeeded

## Testing the Fix

### Manual Test Steps

1. **Create test user account** (if not exists)
   ```bash
   # Sign up at https://savr.cam/sign-up
   # Use email: test+[timestamp]@example.com
   ```

2. **Complete checkout with Stripe test card**
   - Go to `/pricing`
   - Select a plan
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date, any CVC

3. **Verify in Firebase Console**
   - Go to Firestore → users collection → find user by email
   - Check fields:
     - `subscriptionStatus`: should be 'trialing' or 'active'
     - `stripeCustomerId`: should start with 'cus_'
     - `stripeSubscriptionId`: should start with 'sub_'
     - `subscriptionTier`: should be 'basic' or 'pro'

4. **Verify in Application**
   - Homepage should show "Go to Dashboard" button (not "Start Free Trial")
   - Pricing page should show "You're on the [tier] plan"
   - Dashboard features should be accessible

5. **Check Firebase Logs**
   - Go to Firebase Console → Functions → Logs
   - Filter for "Verified: User" messages
   - Should see ✅ success logs, not ❌ critical errors

### Expected Log Output (Success)

```
🔔 Received Stripe webhook: customer.subscription.created (event ID: evt_...)
🔔 Processing subscription update for sub_..., status trialing
🔍 User not found by customer ID cus_..., trying email fallback: user@example.com
✅ Found user abc123 by email fallback, linking customer ID cus_...
✅ Successfully updated user abc123 subscription: {...}
✅ Subscription update for user abc123: tier=basic, status=trialing, cancel_at_period_end=false
✅ Verified: User abc123 status correctly set to 'trialing'

🔔 Received Stripe webhook: checkout.session.completed (event ID: evt_...)
🔔 Processing checkout.session.completed webhook for session cs_...
✅ Checkout session cs_... has claimed user ID: abc123
✅ Email validation passed
✅ Sub sub_..., tier=basic, status=trialing->trialing, cancel_at_period_end=false
✅ Successfully updated user abc123 subscription: {...}
✅ Checkout processed for user abc123, email user@example.com. Customer: cus_..., Sub: sub_..., Tier: basic, Status: trialing
✅ Verified: User abc123 status correctly set to 'trialing'
```

## Rollback Plan

If issues occur after deployment:

1. **Immediate rollback** via Firebase Console:
   ```bash
   cd functions
   firebase deploy --only functions --project production
   # Select previous version when prompted
   ```

2. **Manual subscription fixes** (if needed):
   - Use `/subscription-debug` page to identify affected users
   - Manually update user documents in Firestore Console
   - Set `subscriptionStatus` to 'active' and verify `stripeCustomerId` is populated

## Future Improvements

### Short-term
- [ ] Add automated tests for race condition scenario
- [ ] Create admin tool to bulk-fix any remaining broken subscriptions
- [ ] Add monitoring alerts for "CRITICAL" log messages

### Long-term
- [ ] Consider using Stripe subscription metadata to store user ID (set during checkout)
- [ ] Implement webhook retry logic with exponential backoff
- [ ] Add subscription status sync cron job (daily reconciliation)

## Related Documentation

- `STRIPE_PRICING_TABLE_SETUP.md` - Pricing table integration guide
- `STRIPE_TRIAL_LIFECYCLE.md` - Complete trial flow documentation
- `WEBHOOK_DEBUGGING_GUIDE.md` - Webhook troubleshooting
- `web/app/subscription-debug/page.tsx` - Debug page for subscription status

## Contact

If issues persist after this fix:
1. Check Firebase Functions logs for CRITICAL errors
2. Use `/subscription-debug` page to see user's current status
3. Verify Stripe Dashboard shows subscription as active
4. Contact support with user ID and subscription ID
