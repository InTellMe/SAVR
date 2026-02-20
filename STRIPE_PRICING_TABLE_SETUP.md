# Stripe Pricing Table Setup Guide

## Overview

This guide walks you through setting up Stripe's Pricing Table for SAVR subscriptions. The Pricing Table approach eliminates hardcoded price IDs and centralizes all pricing management in the Stripe Dashboard.

## Prerequisites

- [ ] Stripe account with dashboard access
- [ ] SAVR products already created in Stripe (or ready to create them)
- [ ] Firebase project deployed and configured

## Step 1: Create Products and Prices in Stripe

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Create the following products with their prices:

### Basic Tier

**Product Name**: SAVR Basic

**Monthly Price**:
- Amount: $4.99
- Billing period: Monthly
- Trial: 5 days
- **Metadata**: Add `tier` = `basic`

**Yearly Price**:
- Amount: $49.99
- Billing period: Yearly
- Trial: 5 days
- **Metadata**: Add `tier` = `basic`

### Pro Tier

**Product Name**: SAVR Pro

**Monthly Price**:
- Amount: $9.99
- Billing period: Monthly
- Trial: 5 days
- **Metadata**: Add `tier` = `pro`

**Yearly Price**:
- Amount: $99.99
- Billing period: Yearly
- Trial: 5 days
- **Metadata**: Add `tier` = `pro`

### 🔑 Critical: Add Metadata to Each Price

The backend uses the `metadata.tier` field to determine which subscription tier (basic or pro) the user should receive. **You must add this metadata to each price**.

**How to add metadata**:
1. Click on a price in the Stripe Dashboard
2. Scroll to "Metadata" section
3. Click "Add metadata"
4. Key: `tier`
5. Value: `basic` or `pro` (lowercase)
6. Click "Save"

## Step 2: Create a Pricing Table

1. Go to [Stripe Dashboard → Pricing Tables](https://dashboard.stripe.com/products/pricing-tables)
2. Click "Create pricing table"
3. Configure the table:
   - **Name**: SAVR Pricing Table
   - **Products**: Select all 4 prices you created (Basic Monthly, Basic Yearly, Pro Monthly, Pro Yearly)
   - **Display**: Choose "Toggle" for monthly/yearly switcher
   - **Trial**: Ensure 5-day trial is shown
   - **Promotion codes**: Enable (allows coupon codes at checkout)
   - **Customization**: Adjust colors/styling to match your brand if desired

4. Click "Create pricing table"
5. **Copy the Pricing Table ID** from the embed code - it starts with `prctbl_...`

## Step 3: Configure Stripe Customer Portal

The Customer Portal allows existing subscribers to manage their subscriptions:

1. Go to [Stripe Dashboard → Settings → Billing → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable these features:
   - ✅ Update payment method
   - ✅ Cancel subscription
   - ✅ Switch plans (allows upgrade/downgrade)
   - ✅ View invoices
3. Configure cancellation behavior:
   - **Recommended**: "Cancel at end of billing period" (users retain access until their paid period ends)
4. Click "Save changes"

## Step 4: Update Environment Variables

### For Local Development

Update your `.env.local` file:

```bash
# Replace with your actual values
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=prctbl_...

# Backend secrets (never commit these!)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### For GitHub Actions (Production)

Update these GitHub Secrets at: https://github.com/GooseyPrime/SAVR/settings/secrets/actions

**Add new secret**:
- Name: `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`
- Value: Your pricing table ID (e.g., `prctbl_1Abc2Def3Ghi4Jkl5Mno6Pqr`)

**Remove old secrets** (if they exist):
- ❌ NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY
- ❌ NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_YEARLY
- ❌ NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY
- ❌ NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY
- ❌ STRIPE_PRICE_ID_BASIC_MONTHLY
- ❌ STRIPE_PRICE_ID_BASIC_YEARLY
- ❌ STRIPE_PRICE_ID_PRO_MONTHLY
- ❌ STRIPE_PRICE_ID_PRO_YEARLY

**Keep these secrets** (still required):
- ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- ✅ All Firebase secrets
- ✅ NEXT_PUBLIC_APP_URL

### For Firebase Functions Runtime

The Firebase Functions no longer need the price ID environment variables. Only these Stripe secrets are required:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

## Step 5: Configure Stripe Webhooks

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://YOUR_DOMAIN/stripeWebhook` (or your Firebase Functions URL)
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## Security: Email Validation

The webhook handler includes critical security validation to prevent account takeover attacks:

### What It Does

When a checkout is completed, the backend verifies that the email used at Stripe Checkout matches the email of the Firebase user specified in `client_reference_id`. If emails don't match, the webhook is rejected and the subscription is NOT created.

### Why This Matters

- The `client_reference_id` is set client-side in the pricing table and could theoretically be tampered with by a malicious user
- Without validation, an attacker could modify the user ID to attach their payment to someone else's account
- Email validation ensures payments are only applied to the actual purchaser's account

### How It Works

```typescript
// In handleCheckoutCompleted webhook handler:
// 1. Extract userId from session.client_reference_id
// 2. Fetch user document from Firestore
// 3. Get email from Stripe checkout session (session.customer_details.email)
// 4. Compare emails (case-insensitive)
// 5. Reject webhook if mismatch, proceed if match
```

### User Impact

- Users must complete checkout with the same email they used to create their Firebase account
- If a user needs to change their email, they should update it in Firebase Auth first, then complete checkout
- Mismatched emails will result in a failed subscription and the error will be logged in Firebase Functions logs

## Step 6: Test the Implementation

### Test in Stripe Test Mode

1. Use test API keys (`pk_test_...` and `sk_test_...`)
2. Create test pricing table
3. Deploy to a test environment or run locally

### Test New Subscription Flow

1. As a logged-out user, visit `/pricing`
2. Click "Sign in to continue"
3. Sign in or create an account
4. You should see the Stripe Pricing Table
5. Select a plan
6. Use test card: `4242 4242 4242 4242`, any future date, any CVC
7. Complete checkout
8. Verify you're redirected to dashboard with success message
9. Check Firestore - your user document should have:
   - `subscriptionTier`: `basic` or `pro`
   - `subscriptionStatus`: `active`
   - `stripeCustomerId`: populated

### Test Existing Subscriber Flow

1. As a user with an active subscription, visit `/pricing`
2. You should see a message: "You're on the [Basic/Pro] plan"
3. Click "Manage subscription & billing"
4. Stripe Customer Portal should open
5. Test:
   - Switch plans (upgrade/downgrade)
   - Update payment method
   - View invoices
   - Cancel subscription

### Test Coupon Codes

1. Create a test coupon in Stripe Dashboard:
   - Go to [Coupons](https://dashboard.stripe.com/coupons)
   - Create 100% off coupon for testing
2. During checkout, enter the coupon code
3. Verify:
   - Discount is applied
   - For 100% off: payment method is not required
   - Subscription is still created

## Step 7: Deploy to Production

Once testing is complete:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Recreate everything in Live Mode**:
   - Products with prices (don't forget `metadata.tier`!)
   - Pricing Table (get new `prctbl_...` ID)
   - Customer Portal configuration
   - Webhook endpoint with live keys
3. **Update environment variables** with live values:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
   - `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` = new live pricing table ID
   - `STRIPE_SECRET_KEY` = `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` = new live webhook secret
4. **Deploy** via GitHub Actions or manual deployment
5. **Test end-to-end** with real payment (then refund if needed)

## Troubleshooting

### Problem: Users getting "basic" tier regardless of selected plan

**Solution**: Ensure each price has `metadata.tier` set correctly:
- Check each price in Stripe Dashboard
- Verify metadata field: `tier` = `basic` or `tier` = `pro`

### Problem: Pricing Table not appearing

**Solution**: 
- Verify `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` is set correctly
- Check browser console for errors
- Ensure user is logged in (pricing table only shows for authenticated users)
- Verify Stripe script is loading: https://js.stripe.com/v3/pricing-table.js

### Problem: "Manage billing" button not working

**Solution**:
- Ensure user has a `stripeCustomerId` in Firestore
- Verify `createStripePortal` cloud function is deployed
- Check Customer Portal is configured in Stripe Dashboard

### Problem: Checkout not redirecting back to app

**Solution**:
- Verify success/cancel URLs in pricing table settings match your app URL
- Check `NEXT_PUBLIC_APP_URL` environment variable is correct

### Problem: Webhook not firing

**Solution**:
- Verify webhook endpoint URL is correct and publicly accessible
- Check webhook secret matches `STRIPE_WEBHOOK_SECRET`
- Test webhook in Stripe Dashboard → Webhooks → [Your Endpoint] → "Send test webhook"
- Check Firebase Functions logs for errors

### Problem: Webhook rejecting with "Email mismatch" error

**Cause**: This is a security feature. The email entered at Stripe Checkout doesn't match the email for the Firebase user account specified in `client_reference_id`.

**Solution**:
- Ensure users complete checkout with the same email they used to create their account
- This prevents account takeover attacks where someone could modify the client-reference-id
- If a legitimate user needs to change their email, have them update it in Firebase Auth first
- Check Firebase Functions logs to see which emails were compared

**Security Note**: This validation prevents malicious users from modifying the `client_reference_id` (user ID) in the browser to attach payments to other users' accounts.

## Benefits of This Approach

✅ **No hardcoded price IDs** - all pricing managed in Stripe Dashboard  
✅ **Instant price updates** - change prices without redeploying  
✅ **Built-in trial support** - Stripe handles trial periods automatically  
✅ **Native coupon codes** - promotion codes work out of the box  
✅ **Centralized management** - one place to configure all subscription logic  
✅ **Customer Portal** - users manage their own subscriptions  
✅ **Future-proof** - easy to add new pricing tiers or billing intervals  

## Next Steps

- [ ] Complete Steps 1-7 above
- [ ] Test thoroughly in Stripe Test Mode
- [ ] Deploy to production with live keys
- [ ] Monitor Stripe Dashboard for subscription activity
- [ ] Set up Stripe email notifications for failed payments

## Questions?

See also:
- [PRICING_STRUCTURE.md](./PRICING_STRUCTURE.md) - Full pricing details
- [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) - Complete secrets reference
- [Stripe Pricing Table Docs](https://docs.stripe.com/payments/checkout/pricing-table)
- [Stripe Customer Portal Docs](https://docs.stripe.com/customer-management/integrate-customer-portal)
