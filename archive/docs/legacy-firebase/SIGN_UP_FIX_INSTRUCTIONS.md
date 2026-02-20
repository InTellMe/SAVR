# Sign-Up Authentication & Pricing Table Fix

## Issue Summary
Users signing up with Google are being redirected to the pricing page but cannot see the Stripe Pricing Table to select a plan. This prevents them from completing onboarding and getting a Stripe customer ID.

## Root Cause
The Stripe Pricing Table requires two environment variables to be properly configured:
1. `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`
2. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

If these are missing or empty, the pricing table will not render, leaving users unable to select a plan after sign-up.

## Solution Implemented

### 1. Enhanced Pricing Page Error Handling
The pricing page (`/web/app/pricing/page.tsx`) now includes:

#### ✅ Configuration Validation
- Checks if both required Stripe environment variables are present
- Shows clear error message if configuration is missing

#### ✅ Loading State
- Displays a loading spinner while the Stripe pricing table is being loaded
- Prevents confusion about whether the page is working

#### ✅ Detailed Error Messages
- Shows exactly which environment variables are missing
- Provides administrator instructions for fixing the configuration
- References the MANUAL_STEPS_REQUIRED.md for detailed setup

#### ✅ Timeout Detection
- Monitors for 10 seconds to detect if Stripe table fails to load
- Shows helpful error message if loading fails

### 2. User Experience Flow
After Google sign-up, users now see:

**If Stripe is NOT configured:**
```
┌──────────────────────────────────────────┐
│     ⚠️  Configuration Error              │
│                                           │
│  The pricing table cannot be displayed   │
│  because Stripe is not configured.       │
│                                           │
│  Missing: NEXT_PUBLIC_STRIPE_...         │
│                                           │
│  For administrators:                     │
│  1. Set GitHub Secrets                   │
│  2. Redeploy application                 │
│  3. See MANUAL_STEPS_REQUIRED.md         │
└──────────────────────────────────────────┘
```

**If Stripe IS configured but loading:**
```
┌──────────────────────────────────────────┐
│   🔄 Loading pricing options...          │
└──────────────────────────────────────────┘
```

**If Stripe IS configured and loaded:**
- Shows the full Stripe Pricing Table with all plan options
- User can select a plan and complete checkout

## How to Fix the Configuration

### Step 1: Verify GitHub Secrets Are Set

1. Go to: https://github.com/GooseyPrime/SAVR/settings/secrets/actions
2. Check that the following secrets exist in the **Production** environment:
   - ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - ✅ `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`

### Step 2: Get Stripe Publishable Key (if missing)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to: **Developers → API keys**
3. Copy the **Publishable key**:
   - For production: starts with `pk_live_...`
   - For testing: starts with `pk_test_...`
4. Add as GitHub Secret with name: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Step 3: Get Stripe Pricing Table ID (if missing)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to: **Products → Pricing tables**
3. Select your pricing table (or create one if none exists)
4. Click on the pricing table to view details
5. Look for "Embed on your site" section
6. Copy the **Pricing table ID** (starts with `prctbl_...`)
7. Add as GitHub Secret with name: `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`

### Step 4: Configure Pricing Table Metadata

Each price in your Stripe pricing table must have metadata to identify the tier:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to: **Products**
3. For each product, click to edit
4. For each price, add metadata:
   - **Key**: `tier`
   - **Value**: `basic` or `pro`

This allows the webhook handlers to correctly identify which tier the user subscribed to.

### Step 5: Redeploy the Application

After setting the GitHub Secrets, trigger a new deployment:

**Option A: Re-run the workflow**
1. Go to: https://github.com/GooseyPrime/SAVR/actions
2. Click on the most recent "Firebase Deploy" workflow
3. Click **"Re-run all jobs"**

**Option B: Push an empty commit**
```bash
git commit --allow-empty -m "Trigger deployment with Stripe configuration"
git push origin main
```

### Step 6: Verify the Fix

1. Navigate to: `https://savr.cam/pricing`
2. Sign out if you're already signed in
3. Click "Sign up with Google"
4. Complete the Google authentication
5. You should now see:
   - Blue banner: "Choose a plan to get started"
   - Loading spinner (briefly)
   - **Stripe Pricing Table** with all available plans
6. Select a plan and verify checkout flow works

## Testing Checklist

After deploying the fix, test these scenarios:

### New User Sign-Up Flow
- [ ] Sign up with Google OAuth
- [ ] Redirected to `/pricing`
- [ ] See the "Choose a plan to get started" banner
- [ ] See the Stripe Pricing Table (after brief loading)
- [ ] Can click on a plan and proceed to checkout
- [ ] After checkout, redirected to dashboard with active subscription

### Existing User Sign-In Flow
- [ ] Sign in with existing account (pending status)
- [ ] See pricing table to select a plan
- [ ] Sign in with existing account (active subscription)
- [ ] Redirected to dashboard (not pricing page)

### Error Handling
- [ ] If Stripe is misconfigured, see clear error message
- [ ] Error message shows which env vars are missing
- [ ] Error includes instructions for administrators

### Billing Portal Access
- [ ] User with active subscription can access billing portal
- [ ] Billing portal requires `stripeCustomerId` in Firestore
- [ ] User cannot access billing portal without completing checkout

## Additional Notes

### Why Environment Variables Are Required
- Stripe Pricing Table is a client-side web component
- It requires the publishable key to authenticate with Stripe
- It requires the pricing table ID to know which prices to display
- Without these, the component cannot render

### Security Considerations
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is safe to expose in client-side code
- `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` is also public (used in HTML)
- The `STRIPE_SECRET_KEY` is kept server-side only (Firebase Functions)
- The `STRIPE_WEBHOOK_SECRET` is also server-side only

### Webhook Configuration
The sign-up flow depends on Stripe webhooks:
1. User completes checkout → Stripe sends `checkout.session.completed` webhook
2. Webhook updates Firestore with:
   - `subscriptionStatus: 'active'` or `'trialing'`
   - `subscriptionTier: 'basic'` or `'pro'`
   - `stripeCustomerId: 'cus_...'`
3. User can now access dashboard and billing portal

Verify webhook is configured:
- URL: `https://us-central1-<project-id>.cloudfunctions.net/stripeWebhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

## Related Documentation
- See: `MANUAL_STEPS_REQUIRED.md` - Complete deployment configuration checklist
- See: `GITHUB_SECRETS_SETUP.md` - Detailed GitHub secrets setup guide
- See: `STRIPE_PRICING_TABLE_SETUP.md` - Stripe pricing table configuration
- See: `AUTHENTICATION_FIX.md` - Authentication flow documentation

## Support
If issues persist after following these steps:
1. Check Firebase Functions logs for webhook errors
2. Check Stripe Dashboard → Webhooks → Events for delivery status
3. Check browser console for JavaScript errors
4. Verify all GitHub Secrets are set correctly in the Production environment
