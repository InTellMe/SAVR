# Webhook Debugging and Subscription Tracking - Implementation Summary

## What Was Fixed

### 1. Subscription ID Not Being Recorded ✅

**Problem:** The subscription ID was only stored in the `subscriptions` collection, not on the user document itself, making debugging difficult.

**Solution:**
- Added `stripeSubscriptionId` field to User type (both backend and frontend)
- Now stored on user document during webhook processing
- Visible in `/subscription-debug` page

**Files Changed:**
- `functions/src/types/index.ts`
- `web/contexts/AuthContext.tsx`
- `functions/src/utils/subscription.ts`
- `functions/src/services/stripe.ts`

### 2. Silent Webhook Failures ✅

**Problem:** Webhooks were being received by Stripe but failing silently in Firebase Functions with no way to identify the failure point.

**Solution:** Added comprehensive emoji-based logging throughout all webhook handlers:

```
🔔 = Webhook received
✅ = Validation passed / Success
❌ = Error / Failure
🔄 = Database operation in progress
⏰ = Trial-related event
💰 = Payment event
```

**Logging Added:**
- Entry point logging for every webhook event
- Step-by-step validation logging in `handleCheckoutCompleted`
- Database operation success/failure logging
- Try-catch blocks around all database operations
- Detailed error messages for each failure scenario

### 3. Missing Trial Lifecycle Documentation ✅

**Problem:** No documentation on how the 5-day trial works, what events Stripe sends, or how the system handles them.

**Solution:** Created `STRIPE_TRIAL_LIFECYCLE.md` with complete documentation including:
- Day-by-day trial flow
- All Stripe events and when they fire
- Payment retry logic
- Status transitions
- Testing instructions

### 4. No Way to Verify Subscription Data ✅

**Problem:** Users and developers couldn't easily see what subscription data was actually stored in Firestore.

**Solution:** Created `/subscription-debug` page that shows:
- User ID and email
- Subscription status, tier, and IDs
- Trial end date
- Expected values for comparison
- Troubleshooting steps

## How to Use the New Debugging Features

### 1. Check Firebase Functions Logs

```bash
# View all webhook logs
firebase functions:log --only stripeWebhook

# Filter for specific patterns
firebase functions:log --only stripeWebhook | grep "❌"  # Show only errors
firebase functions:log --only stripeWebhook | grep "🔔"  # Show received events
```

**What to Look For:**

✅ **Successful Webhook Processing:**
```
🔔 Received Stripe webhook: checkout.session.completed
🔔 Processing checkout.session.completed webhook for session cs_xxx
✅ Checkout session cs_xxx has claimed user ID: user_xxx
✅ User document found for user_xxx
✅ User email from Firestore: user@example.com
✅ Session email from Stripe: user@example.com
✅ Email validation passed
✅ Stripe customer ID: cus_xxx
✅ User ID verified against customer ID: user_xxx
✅ Subscription ID: sub_xxx
✅ Subscription tier: basic
✅ Subscription status: trialing → trialing
✅ Trial ends at: 2026-02-20T01:48:27.000Z
🔄 Updating user document for user_xxx...
✅ Successfully updated user user_xxx subscription
🔄 Updating subscription record for user_xxx...
✅ Successfully updated subscription record for user user_xxx
✅ Successfully processed checkout for user user_xxx
```

❌ **Common Failure Patterns:**

**Email Mismatch:**
```
❌ Email mismatch for user xxx: Firestore email 'old@email.com' does not match 
   Stripe session email 'new@email.com'. Possible account takeover attempt - rejecting webhook.
```
**Solution:** User changed email between signup and checkout. Need to manually verify and update.

**User Not Found:**
```
❌ User xxx not found in Firestore - rejecting checkout webhook
```
**Solution:** User document wasn't created properly during signup. Check `onUserCreate` function.

**No Customer ID:**
```
❌ No Stripe customer ID in checkout session cs_xxx for user xxx. 
   Customer will not be able to access billing portal. Rejecting webhook.
```
**Solution:** Stripe session is missing customer ID. Check Stripe Pricing Table configuration.

**Database Update Failed:**
```
❌ Failed to update user xxx subscription: [Error details]
```
**Solution:** Firestore permissions issue or malformed data. Check Firestore rules and data types.

### 2. Use the Subscription Debug Page

**Access:** Navigate to `/subscription-debug` while logged in

**What It Shows:**
- **User ID** - Firebase Auth user identifier
- **Email** - User's email address
- **Email Verified** - Whether email has been verified
- **Status** - Current subscription status (should be 'trialing' or 'active')
- **Tier** - Subscription tier (should be 'basic' or 'pro')
- **Stripe Customer ID** - Should start with 'cus_'
- **Stripe Subscription ID** - Should start with 'sub_'
- **Trial Ends At** - When trial expires (should be ~5 days from subscription)

**Expected Values After Successful Subscription:**
```
Status: trialing
Tier: basic (or pro)
Stripe Customer ID: cus_xxxxxxxxxxxxx
Stripe Subscription ID: sub_xxxxxxxxxxxxx
Trial Ends At: 2026-02-20T01:48:27.000Z
```

**If You See "Not set" or "pending":**
1. Check Stripe Dashboard → Developers → Webhooks for delivery status
2. Check Firebase Functions logs for webhook errors (see above)
3. Verify you completed the full checkout (not just opened the checkout page)
4. Wait 30 seconds and refresh the page (webhook might still be processing)

### 3. Check Stripe Dashboard

**Webhooks:**
- Go to: Stripe Dashboard → Developers → Webhooks
- Click on your webhook endpoint
- Check "Events" tab for recent deliveries
- Look for failed deliveries (red indicators)
- Click on individual events to see request/response

**Expected Events After Subscription:**
1. `checkout.session.completed` - User completed checkout
2. `customer.subscription.created` - Subscription created
3. `customer.subscription.trial_will_end` - 3 days before trial ends
4. `invoice.payment_succeeded` or `invoice.payment_failed` - When trial ends

**Customers:**
- Go to: Stripe Dashboard → Customers
- Search for user's email
- Verify customer exists and has subscription
- Check subscription status and trial end date

## Event Flow Diagram

```
User Completes Checkout
         ↓
checkout.session.completed (Stripe → Firebase)
         ↓
handleCheckoutCompleted()
         ↓
Validate User ID ✅
         ↓
Validate Email ✅
         ↓
Validate Customer ID ✅
         ↓
Extract Subscription ID ✅
         ↓
Update User Document (Firestore)
   - subscriptionStatus: 'trialing'
   - subscriptionTier: 'basic'
   - stripeCustomerId: 'cus_xxx'
   - stripeSubscriptionId: 'sub_xxx'
   - trialEndsAt: Date
         ↓
Update Subscription Record (Firestore)
         ↓
Success ✅
```

## Troubleshooting Common Issues

### Issue: Status Stays "pending"

**Symptoms:**
- User completed checkout
- Stripe shows successful payment
- Firestore still shows `subscriptionStatus: 'pending'`

**Debugging Steps:**
1. Check Firebase Functions logs for webhook errors
2. Check Stripe Dashboard → Webhooks for delivery failures
3. Visit `/subscription-debug` to see current values
4. Look for validation failures in logs (email mismatch, missing IDs, etc.)

**Most Common Causes:**
- Email mismatch between Firebase Auth and Stripe
- User document doesn't exist in Firestore
- Webhook endpoint not configured correctly
- Firestore security rules blocking updates

### Issue: Subscription ID Not Recorded

**Symptoms:**
- `stripeCustomerId` is set
- `stripeSubscriptionId` shows "Not set"
- User has access to features

**Debugging Steps:**
1. Check if checkout session included subscription:
   - Look for "Subscription ID: sub_xxx" in logs
   - If missing, checkout might not have created subscription
2. Check Stripe Dashboard for subscription under customer
3. Manually trigger `customer.subscription.updated` webhook from Stripe

**Most Common Causes:**
- Checkout session was for one-time payment, not subscription
- Subscription creation failed in Stripe
- Webhook fired before subscription was attached to session

### Issue: Trial Period Not Tracking

**Symptoms:**
- `trialEndsAt` shows "N/A"
- Unsure when trial expires

**Debugging Steps:**
1. Check Stripe Dashboard → Customer → Subscription
2. Look for "Trial ends" date
3. Check logs for "Trial ends at: [date]"
4. Manually trigger `customer.subscription.updated` webhook

**Most Common Causes:**
- Trial wasn't configured in Stripe pricing table
- Subscription created without trial
- `trialEndsAt` field not being read correctly (check for Timestamp vs Date)

## New Webhook Events Handled

### customer.subscription.created
- Calls `handleSubscriptionUpdated` (same as update)
- Ensures subscription is tracked even if checkout webhook fails

### customer.subscription.trial_will_end
- Fires 3 days before trial ends
- Currently just logged for visibility
- Could be used to send reminder emails

### invoice.payment_succeeded
- Fires when payment succeeds (including first payment after trial)
- Updates subscription status if needed
- Confirms successful payment

## Testing the Fix

### 1. Test Successful Subscription Flow

```bash
# 1. Start monitoring logs
firebase functions:log --only stripeWebhook

# 2. Complete checkout with test card: 4242 4242 4242 4242

# 3. Check logs for:
✅ All validation steps passing
✅ Database updates succeeding
✅ Subscription ID being stored

# 4. Visit /subscription-debug and verify:
- Status: trialing
- Subscription ID: sub_xxx
- Trial Ends At: (date)
```

### 2. Test Failed Payment Flow

```bash
# 1. Complete checkout with failing test card: 4000 0000 0000 0341

# 2. Check logs for:
❌ Payment failure event
🔄 Status updated to past_due

# 3. Visit /subscription-debug and verify:
- Status: past_due
```

### 3. Test Email Mismatch

```bash
# 1. Sign up with email A
# 2. Change email in Firebase to email B
# 3. Complete checkout with email A
# 4. Check logs for:
❌ Email mismatch error
```

## Summary

The implementation now provides:

1. **Complete Visibility** - Every webhook step is logged
2. **Subscription ID Tracking** - Stored on user document for easy access
3. **User-Facing Debug Tools** - `/subscription-debug` page
4. **Comprehensive Documentation** - Trial lifecycle fully documented
5. **Error Handling** - Try-catch blocks with specific error messages
6. **New Event Handlers** - trial_will_end, payment_succeeded, subscription.created

All changes are backward compatible and won't affect existing users. The enhanced logging will immediately identify any webhook processing issues.
