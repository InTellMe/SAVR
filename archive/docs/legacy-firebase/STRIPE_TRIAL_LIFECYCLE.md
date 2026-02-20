# Stripe Trial Lifecycle and Event Handling

## Overview

SAVR offers a 5-day free trial on all subscription plans. This document explains how the trial period is tracked, what happens when it ends, and which Stripe events are handled by the system.

## Trial Period Flow

### 1. User Subscribes (Day 0)

**User Action:** User completes checkout via Stripe Pricing Table

**Stripe Events Fired:**
- `checkout.session.completed`
- `customer.subscription.created`

**What Happens:**
```javascript
// User document is updated in Firestore
{
  subscriptionStatus: 'trialing',
  subscriptionTier: 'basic' or 'pro',
  stripeCustomerId: 'cus_xxx',
  stripeSubscriptionId: 'sub_xxx',
  trialEndsAt: Date (5 days from now)
}

// Subscription record is created in subscriptions collection
{
  userId: 'user_xxx',
  provider: 'stripe',
  stripeSubscriptionId: 'sub_xxx',
  status: 'trialing',
  startDate: Date (now)
}
```

**Access Granted:** User immediately gets full access to all features in their tier. Both 'trialing' and 'active' statuses are treated identically for feature access.

### 2. During Trial (Days 1-4)

**What Happens:**
- User has full access to all features
- No payment attempts are made
- Trial countdown is visible (if implemented in UI)

**Stripe Events:** None (unless user manually cancels)

### 3. Trial Ending Soon (Day 2)

**Stripe Event Fired:**
- `customer.subscription.trial_will_end`

**What Happens:**
- Event is logged for visibility
- No database updates needed
- Optional: Could send email reminder to user (not currently implemented)

### 4. Trial Ends (Day 5)

**What Happens:**
- Stripe automatically attempts to charge the customer's payment method
- Two possible outcomes:

#### Outcome A: Payment Succeeds ✅

**Stripe Events Fired:**
- `invoice.payment_succeeded`
- `customer.subscription.updated` (status changes: trialing → active)

**Database Updates:**
```javascript
// User document is updated
{
  subscriptionStatus: 'active',
  // trialEndsAt remains for historical record
}

// Subscription record is updated
{
  status: 'active'
}
```

**User Access:** Continues uninterrupted

#### Outcome B: Payment Fails ❌

**Stripe Events Fired:**
- `invoice.payment_failed`
- `customer.subscription.updated` (status changes: trialing → past_due)

**Database Updates:**
```javascript
// User document is updated
{
  subscriptionStatus: 'past_due'
}

// Subscription record is updated
{
  status: 'past_due'
}
```

**User Access:** Depends on implementation. Currently:
- `past_due` is treated as inactive subscription
- User is downgraded to basic/free tier
- Stripe will retry payment automatically based on retry rules

## Webhook Events Handled

### Core Subscription Events

| Event | Handler | Purpose |
|-------|---------|---------|
| `checkout.session.completed` | `handleCheckoutCompleted()` | Initial subscription creation after checkout |
| `customer.subscription.created` | `handleSubscriptionUpdated()` | Subscription created (handled same as update) |
| `customer.subscription.updated` | `handleSubscriptionUpdated()` | Status changes (trialing→active, upgrades, etc.) |
| `customer.subscription.deleted` | `handleSubscriptionDeleted()` | User cancels subscription |
| `customer.subscription.trial_will_end` | Logged only | Trial ending in 3 days (informational) |

### Payment Events

| Event | Handler | Purpose |
|-------|---------|---------|
| `invoice.payment_succeeded` | `handlePaymentSucceeded()` | First payment after trial succeeds |
| `invoice.payment_failed` | `handlePaymentFailed()` | Payment fails (trial or recurring) |

## Subscription Status Values

| Stripe Status | Internal Status | Feature Access | Description |
|---------------|-----------------|----------------|-------------|
| `trialing` | `trialing` | ✅ Full access | During trial period |
| `active` | `active` | ✅ Full access | Paid and active |
| `past_due` | `past_due` | ❌ Restricted | Payment failed, retry in progress |
| `canceled` | `cancelled` | ❌ Restricted | User cancelled |
| `unpaid` | `past_due` | ❌ Restricted | All payment retries failed |
| `incomplete` | `past_due` | ❌ Restricted | Initial payment failed |
| `incomplete_expired` | `past_due` | ❌ Restricted | Initial payment expired |

## Stripe's Automatic Retry Logic

When a payment fails at trial end:

1. **Immediate Retry:** Stripe retries immediately
2. **Smart Retries:** Up to 4 automatic retries over 2-3 weeks
3. **Retry Schedule:** 
   - 3 days after first failure
   - 5 days after second failure
   - 7 days after third failure
   - 7 days after fourth failure

During retries:
- Subscription status remains `past_due`
- User has restricted access
- Stripe sends dunning emails automatically

After all retries fail:
- Subscription status becomes `canceled` or `unpaid`
- `customer.subscription.deleted` event fires
- User loses access completely

## Testing Trial Flow

### Test Cards for Different Scenarios

**Successful Payment:**
```
Card: 4242 4242 4242 4242
Result: Payment succeeds, subscription becomes active
```

**Payment Fails:**
```
Card: 4000 0000 0000 0341
Result: Payment fails, subscription becomes past_due
```

**Requires Authentication:**
```
Card: 4000 0025 0000 3155
Result: Payment requires 3D Secure authentication
```

### Testing in Stripe Dashboard

1. Create test subscription with 1-minute trial (instead of 5 days)
2. Use Stripe CLI to trigger webhooks manually:
   ```bash
   stripe trigger customer.subscription.trial_will_end
   stripe trigger invoice.payment_failed
   ```

## Current Implementation Gaps

### What's Implemented ✅
- Storing trial end date (`trialEndsAt`)
- Detecting 'trialing' status
- Handling status transitions
- Comprehensive webhook logging
- Subscription ID tracking on user document

### What's Not Implemented ❌
- Email notifications for trial ending
- UI countdown/banner for trial period
- Automatic cleanup of expired trials
- Webhook for `invoice.upcoming` (7 days before charge)
- Custom trial periods per plan

## Debugging Webhooks

### Viewing Logs

Check Firebase Functions logs for webhook processing:

```bash
firebase functions:log --only stripeWebhook
```

Look for these log patterns:
- `🔔` Webhook received
- `✅` Success checkpoints
- `❌` Error conditions
- `🔄` Database updates
- `⏰` Trial events

### Common Issues

**Status stays 'pending':**
- Check: Was `checkout.session.completed` webhook received?
- Check: Does Firestore user document exist?
- Check: Email validation passing?

**Subscription ID not recorded:**
- Check: Does checkout session have subscription attached?
- Check: Is `stripeSubscriptionId` field being set?

**Trial not ending:**
- This is Stripe's responsibility - check Stripe Dashboard
- Verify subscription has correct trial_end timestamp
- Ensure webhooks are configured correctly

## Related Files

- `functions/src/services/stripe.ts` - Webhook handlers
- `functions/src/utils/subscription.ts` - Subscription utilities
- `functions/src/types/index.ts` - Type definitions
- `web/contexts/AuthContext.tsx` - Frontend subscription status
