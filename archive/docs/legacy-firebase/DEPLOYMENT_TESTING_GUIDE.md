# Subscription Fix - Deployment & Testing Guide

## Quick Summary

**Problem:** Users who paid for subscriptions weren't being recognized as subscribed. They kept seeing pricing CTAs and were denied access to paid features.

**Root Cause:** Webhook race condition - Stripe fires webhooks asynchronously, and if `customer.subscription.created` arrived before `checkout.session.completed`, user lookup failed.

**Solution:** Enhanced user lookup with email fallback that handles webhooks in any order, plus verification logging to catch any remaining issues.

## Pre-Deployment Checklist

Before deploying this fix to production:

- [x] Code review completed - all feedback addressed
- [x] Security scan completed - no vulnerabilities found
- [x] Documentation created - STRIPE_SUBSCRIPTION_FIX.md
- [x] Line numbers verified in documentation
- [x] Cost justification comments added for verification reads
- [ ] Deploy functions to production
- [ ] Monitor Firebase logs for first few checkouts
- [ ] Verify existing subscribed users still have access

## Deployment Steps

### 1. Deploy Firebase Functions

```bash
cd functions
npm run build  # Verify no build errors (existing errors are pre-existing)
firebase deploy --only functions --project production
```

### 2. Monitor Initial Deployment

After deployment, watch the Firebase Console → Functions → Logs for:
- ✅ "Verified: User XXX status correctly set" messages
- ⚠️ Any "CRITICAL" error messages
- 🔍 "User not found by customer ID, trying email fallback" (indicates race condition was caught)

### 3. Test with Stripe Test Mode (Optional but Recommended)

If you want to test before real users hit it:

1. Temporarily set Stripe keys to test mode in GitHub Secrets:
   - Use test `STRIPE_SECRET_KEY` (starts with `sk_test_`)
   - Use test `STRIPE_WEBHOOK_SECRET` (from test webhook endpoint)
   - Use test `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

2. Complete a test checkout:
   - Card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits

3. Check Firestore → users collection → verify status is 'trialing'

4. Switch back to production keys

## Post-Deployment Monitoring

### What to Watch For

#### Success Indicators ✅
```
🔔 Received Stripe webhook: customer.subscription.created
🔍 User not found by customer ID cus_..., trying email fallback: user@example.com
✅ Found user abc123 by email fallback, linking customer ID cus_...
✅ Verified: User abc123 status correctly set to 'trialing'
```

#### Problem Indicators ❌
```
❌ CRITICAL: User abc123 status mismatch after checkout!
❌ No user found for subscription sub_..., customer cus_...
```

If you see critical errors:
1. Check the full error message in logs
2. Get the user ID and subscription ID
3. Manually verify in Stripe Dashboard that subscription exists
4. Check Firestore to see current user document state
5. Use `/subscription-debug` page to see user's perspective

### Verify Existing Subscriptions Work

After deployment, have a few existing subscribed users:
1. Reload the homepage - should see "Go to Dashboard" not "Start Free Trial"
2. Visit `/pricing` - should see "You're on the [tier] plan"
3. Access dashboard features - should work without redirect

## Testing New Subscriptions

### Test Scenario 1: Normal Checkout Flow

1. Create new account or use existing test account
2. Go to `/pricing`
3. Click on a plan
4. Complete checkout with test card: 4242 4242 4242 4242
5. **Expected Result:**
   - Redirected to success page or dashboard
   - Homepage shows "Go to Dashboard" button
   - `/pricing` shows "You're on the [tier] plan"
   - Dashboard features are accessible

### Test Scenario 2: Verify Firestore Data

After a successful checkout:
1. Go to Firebase Console → Firestore → users collection
2. Find user by email
3. Check these fields are set:
   - `subscriptionStatus`: 'trialing' or 'active'
   - `subscriptionTier`: 'basic' or 'pro'
   - `stripeCustomerId`: starts with 'cus_'
   - `stripeSubscriptionId`: starts with 'sub_'
   - `trialEndsAt`: Date 5 days in future (for trial)

### Test Scenario 3: Check Webhook Logs

1. Go to Firebase Console → Functions → Logs
2. Filter by time of checkout
3. Look for these log patterns:
   ```
   🔔 Processing checkout.session.completed
   ✅ Checkout processed for user ...
   ✅ Verified: User ... status correctly set to 'trialing'
   
   🔔 Processing subscription update for sub_...
   ✅ Subscription update for user ...
   ✅ Verified: User ... status correctly set to 'trialing'
   ```

### Test Scenario 4: Race Condition Handling

The race condition happens randomly, but you can verify it's handled:

1. Complete a checkout
2. Check Firebase logs for this sequence:
   ```
   🔍 User not found by customer ID cus_..., trying email fallback
   ✅ Found user abc123 by email fallback, linking customer ID
   ```
3. If you see this, the race condition occurred and was handled correctly!

## Rollback Plan

If critical issues occur:

### Immediate Rollback
```bash
cd functions
firebase deploy --only functions --project production
# Select previous deployment when prompted
```

### Manual Fix for Affected Users

If specific users are stuck:

1. Get their user ID from `/subscription-debug` page or Firebase Console
2. Go to Stripe Dashboard → Find their subscription
3. Verify subscription is active in Stripe
4. Go to Firebase Console → Firestore → users → [userId]
5. Manually set:
   ```
   subscriptionStatus: "active"  // or "trialing"
   subscriptionTier: "basic"     // or "pro"
   stripeCustomerId: "cus_..."   // from Stripe
   stripeSubscriptionId: "sub_..." // from Stripe
   ```
6. User should refresh their browser - access should work immediately

## Common Issues & Solutions

### Issue: User sees pricing CTAs after paying

**Diagnosis:**
1. Check `/subscription-debug` - what does status show?
2. Check Stripe Dashboard - is subscription active?
3. Check Firebase logs - any critical errors?

**Solutions:**
- If status is 'pending': Webhook didn't process. Check webhook secret.
- If status is missing: Database update failed. Check Firestore rules.
- If customer ID missing: Email mismatch or security validation failed.

### Issue: Webhooks not firing

**Diagnosis:**
1. Stripe Dashboard → Developers → Webhooks → [your endpoint]
2. Check delivery attempts and responses

**Solutions:**
- Verify webhook URL is correct (should be your Functions URL)
- Verify webhook secret matches STRIPE_WEBHOOK_SECRET
- Check Functions are deployed and running

### Issue: Email mismatch errors

**Diagnosis:** Logs show "Email mismatch" rejection

**Solution:**
User entered different email at Stripe checkout than their Firebase account. This is a security feature. User must:
1. Cancel current subscription attempt
2. Use same email at checkout as their account email

## Success Metrics

After 24 hours of deployment, check:

- ✅ No "CRITICAL" errors in Firebase logs
- ✅ All new subscriptions have status 'active' or 'trialing'
- ✅ No support tickets about "can't access after payment"
- ✅ Stripe Dashboard subscription count matches active users in Firestore

## Support Contact

If issues persist:
1. Gather: user ID, subscription ID, checkout session ID, error logs
2. Check STRIPE_SUBSCRIPTION_FIX.md for detailed troubleshooting
3. Use /subscription-debug page to get user's current state
4. Check Stripe Dashboard for subscription status

## Notes

- Verification logging adds small Firestore read cost but is justified for critical bug
- Email fallback requires Stripe API call but only for race condition cases
- Self-healing means once a user is linked, future webhooks use fast path
- Fix is backward compatible - no changes needed for existing subscriptions
