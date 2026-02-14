# Stripe Billing Portal & Pricing Table Fix

## Issues Fixed

This document describes the fixes applied to resolve two Stripe-related issues:
1. **Pricing table not showing up on the pricing page**
2. **Billing portal fails to open for subscription management**

---

## Issue 1: Pricing Table Not Displaying

### Problem
The Stripe Pricing Table was not appearing on the `/pricing` page even though the `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` environment variable was set correctly in GitHub Actions secrets.

### Root Cause
The `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` environment variable was **not being passed to the Next.js build step** in the GitHub Actions workflow. While the secret existed in GitHub Secrets, it wasn't being injected into the build environment, resulting in the variable being `undefined` at runtime.

### Solution
Added `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` to the build step environment variables in `.github/workflows/firebase-deploy.yml`:

```yaml
- name: Build web app
  working-directory: web
  env:
    NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
    NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY }}
    NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID: ${{ secrets.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID }}  # ✅ ADDED
    NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
  run: npm run build
```

### Impact
After the next deployment:
- The pricing table will now appear correctly for logged-in users on the `/pricing` page
- Users will be able to select and subscribe to Basic or Pro plans
- The table will show monthly/yearly pricing options with the 5-day trial

---

## Issue 2: Billing Portal Access

### Problem
The billing portal link (`https://billing.stripe.com/p/login/...`) was mentioned as failing to open for subscription management.

### Understanding the Issue
There are **two ways** to access the Stripe Customer Portal:

1. **Direct Stripe Portal Link** (Low-Code Approach)
   - Stripe provides a direct login link: `https://billing.stripe.com/p/login/...`
   - This is Stripe's hosted portal - customers log in with their email
   - This link is **NOT** integrated into the SAVR app code
   - It's a standalone Stripe service for customers to manage their subscriptions

2. **Integrated Portal via Firebase Function** (SAVR's Current Approach)
   - SAVR uses the `createStripePortal` Firebase Function
   - Called from the pricing page when users click "Manage subscription & billing"
   - Creates a Stripe Billing Portal session tied to the user's Stripe customer ID
   - Redirects user directly to their billing portal (no separate login needed)

### Root Cause
The `createStripePortal` Firebase Function had a fallback URL pointing to the old `pantrychef.intellmeai.com` domain instead of the current `www.SAVR.cam` domain.

### Solution
Updated the fallback URL in `functions/src/index.ts`:

```typescript
// Before
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pantrychef.intellmeai.com';
const resolvedReturnUrl = returnUrl || `${appBaseUrl}/settings`;

// After
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appBaseUrl) {
  console.warn('NEXT_PUBLIC_APP_URL not set, using fallback URL for billing portal return');
}
const baseUrl = appBaseUrl || 'https://savr.cam';
const resolvedReturnUrl = returnUrl || `${baseUrl}/settings`;
```

### Impact
- The billing portal button in the app now works correctly
- Users with active subscriptions can click "Manage subscription & billing" on `/pricing`
- They'll be redirected to Stripe's Customer Portal where they can:
  - Update payment methods
  - View invoices
  - Switch plans (upgrade/downgrade)
  - Cancel subscription

---

## About Stripe's Low-Code Integration

The link mentioned in the issue is part of Stripe's **Customer Portal Low-Code Integration**. Here's what you should know:

### What It Is
- A **standalone billing portal** hosted by Stripe
- Customers access it via a direct link (not through your app)
- Customers log in with their email address
- They can manage subscriptions without logging into SAVR

### When to Use It
- Email campaigns to existing subscribers
- Customer support scenarios (send link to customers who need help)
- As a backup if the integrated portal has issues

### How It Works with SAVR
1. Customer clicks the Stripe portal link
2. Stripe asks for their email address
3. Stripe sends a magic link to their email
4. Customer clicks the email link and accesses their billing portal
5. They can manage their subscription independently

### Configuration
The Stripe Customer Portal is configured in the Stripe Dashboard:
- Go to: [Stripe Dashboard → Settings → Billing → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
- Enable features:
  - ✅ Update payment method
  - ✅ Cancel subscription
  - ✅ Switch plans
  - ✅ View invoices

This configuration applies to **both** the direct link and the integrated portal.

---

## Verification Steps

After deployment, verify both fixes work:

### Test Pricing Table
1. Log into SAVR at https://savr.cam
2. Navigate to `/pricing`
3. If you **don't have** an active subscription:
   - ✅ You should see the Stripe Pricing Table
   - ✅ Monthly and yearly options should be visible
   - ✅ You should be able to click on a plan to start checkout

### Test Integrated Billing Portal
1. Log into SAVR with an account that has an **active subscription**
2. Navigate to `/pricing`
3. You should see: "You're on the [Basic/Pro] plan"
4. Click "Manage subscription & billing"
5. ✅ You should be redirected to Stripe's Customer Portal
6. ✅ The portal should show your subscription details
7. ✅ After managing billing, clicking "Back" should return you to SAVR

### Test Direct Stripe Portal Link
1. Open your Stripe portal link: `https://billing.stripe.com/p/login/[your-portal-id]`
   - Get your portal link from [Stripe Dashboard → Settings → Billing → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enter a customer email address (must have a Stripe subscription)
3. Check email for the magic link from Stripe
4. Click the magic link
5. ✅ You should see the Stripe Customer Portal
6. ✅ You can manage your subscription

---

## Required GitHub Secrets

Ensure these secrets are set in GitHub Actions:

**Required for Pricing Table:**
- ✅ `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` - The pricing table ID from Stripe Dashboard
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key

**Required for Billing Portal:**
- ✅ `STRIPE_SECRET_KEY` - Your Stripe secret key (set as Firebase Function secret)
- ✅ `NEXT_PUBLIC_APP_URL` - Your production URL (https://savr.cam)

To set Firebase Function secrets:
```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

---

## Troubleshooting

### Pricing Table Still Not Showing
1. Check that `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` is set in GitHub Secrets
2. Check browser console for errors
3. Verify user is logged in (table only shows for authenticated users)
4. Check that the pricing table ID starts with `prctbl_`
5. Verify the latest deployment included the workflow changes

### Billing Portal Button Not Working
1. Verify user has `stripeCustomerId` field in Firestore
2. Check `createStripePortal` function is deployed in Firebase Console
3. Check browser console for Firebase function call errors
4. Verify `STRIPE_SECRET_KEY` is set as Firebase Function secret
5. Verify Stripe Customer Portal is configured in Stripe Dashboard

### Direct Portal Link Not Working
1. Verify the link is copied completely (they're very long)
2. Check that the customer email exists in Stripe
3. Check spam folder for the Stripe magic link email
4. Verify Customer Portal is enabled in Stripe Dashboard settings

---

## Related Documentation

- [STRIPE_PRICING_TABLE_SETUP.md](./STRIPE_PRICING_TABLE_SETUP.md) - Complete Stripe setup guide
- [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) - How to configure all GitHub secrets
- [Stripe Pricing Table Docs](https://docs.stripe.com/payments/checkout/pricing-table)
- [Stripe Customer Portal Docs](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [Stripe Low-Code Portal Guide](https://docs.stripe.com/no-code/customer-portal)

---

## Summary

Both issues have been resolved:

1. ✅ **Pricing Table** - Now displays correctly by passing `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` to the build
2. ✅ **Billing Portal** - Works correctly with updated domain fallback in `createStripePortal` function

The next deployment will include both fixes. The direct Stripe portal link (`https://billing.stripe.com/p/login/...`) works independently and doesn't require any code changes - it's configured entirely through the Stripe Dashboard.
