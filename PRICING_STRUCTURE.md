# SAVR Pricing Structure

## Overview

SAVR has a two-tier paid subscription model with coupon code support:
- **Basic**: Affordable entry point with essential features
- **Pro**: Unlimited access with advanced features

**All plans support coupon codes** - you can use a 100% discount coupon to get free access!

## Implementation

### Stripe Pricing Table

SAVR uses Stripe's **embeddable Pricing Table** for subscription management. This eliminates the need for hardcoded price IDs and allows all pricing to be managed directly in the Stripe Dashboard.

**Benefits**:
- ✅ No hardcoded price IDs in the codebase
- ✅ Centralized pricing management in Stripe Dashboard
- ✅ Instant price updates without code changes
- ✅ Built-in support for monthly/yearly toggles
- ✅ Native coupon code integration
- ✅ Automatic trial period support

## Tiers

### Basic Tier (Paid)

**Cost**: 
- **Monthly**: $4.99/month
- **Yearly**: $49.99/year (save ~$10/year)

**Features**:
- Smart inventory (up to 50 items)
- 10 AI recipes per month
- 2 meal plans per month
- 5 pet recipes per month
- Basic grocery lists
- Community support

**Limitations**:
- No AI chat assistant
- Limited monthly generations

### Pro Tier (Paid)

**Cost**: 
- **Monthly**: $9.99/month
- **Yearly**: $99.99/year (save ~$20/year)

**Features**:
- Everything in Basic tier
- **Unlimited inventory items**
- **Unlimited AI recipes**
- **Unlimited meal plans**
- **Unlimited pet recipes**
- **AI cooking assistant chat**
- Ad-free experience
- Cancel anytime

## Coupon Code Support

### How It Works

1. **Enter Coupon at Checkout**: Stripe Pricing Table includes a promotion code field
2. **Automatic Discount**: Coupon is validated and applied by Stripe
3. **$0 Checkout**: If the coupon results in a $0.00 total:
   - Payment information is **not collected**
   - User gets immediate access
   - Subscription is still tracked in Stripe

### Creating Coupons in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/coupons)
2. Click "Create Coupon"
3. Configure:
   - **Percent off**: e.g., 100% for free access
   - **Duration**: once, forever, or repeating
   - **Code**: Optional custom code (or auto-generate)

**Common Coupon Use Cases**:
- `WELCOME100`: 100% off first month (trial)
- `ANNUAL20`: 20% off annual plans
- `FRIEND50`: 50% off for referrals

## Stripe Configuration

### 1. Create Products and Pricing Table

1. **Create Products** in [Stripe Dashboard → Products](https://dashboard.stripe.com/products):
   - Basic Monthly ($5.99/month)
   - Basic Yearly ($69.99/year)
   - Pro Monthly ($9.99/month)
   - Pro Yearly ($99.99/year)

2. **Add Metadata to Each Price**:
   - Go to each price and add metadata: `tier` = `basic` or `tier` = `pro`
   - This metadata is used by the backend to determine subscription tier

3. **Create Pricing Table** in [Stripe Dashboard → Pricing Tables](https://dashboard.stripe.com/products/pricing-tables):
   - Add your 4 products (Basic & Pro, Monthly & Yearly)
   - Configure trial period: 5 days
   - Enable promotion codes
   - Copy the Pricing Table ID (starts with `prctbl_`)

### 2. Environment Variables

#### For Server-Side (API routes):
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### For Client-Side (Next.js Web App):
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=prctbl_...
```

### 3. Configure Stripe Customer Portal

For existing subscribers to manage their subscriptions:

1. Go to [Stripe Dashboard → Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable:
   - Update payment method
   - Cancel subscription
   - Switch plans
   - View invoices

## How It Works

### For New Subscribers

1. User visits `/pricing` page
2. Stripe Pricing Table is embedded with user's `uid` as `client-reference-id`
3. User selects plan and completes Stripe Checkout
4. `checkout.session.completed` webhook fires
5. Backend retrieves `client_reference_id` to identify user
6. Backend fetches price metadata to determine tier (`basic` or `pro`)
7. User's Supabase `users` row is updated with subscription details

### For Existing Subscribers

1. User visits `/pricing` page
2. System detects active subscription
3. Shows "Manage subscription & billing" button
4. Button opens Stripe Customer Portal
5. User can upgrade, downgrade, update payment, or cancel

## Testing

### Test Mode Setup

1. Create test products and pricing table in Stripe Test Mode
2. Use test API keys (`pk_test_...` and `sk_test_...`)
3. Use test pricing table ID

### Test Scenarios

1. **New Subscription**:
   - Visit pricing page
   - Select plan from Pricing Table
   - Complete checkout with test card: `4242 4242 4242 4242`
   - Verify subscription created and tier updated

2. **With Coupon**:
   - Create 100% off coupon in Stripe Dashboard
   - Enter code at checkout
   - Verify payment not collected
   - Verify subscription still created

3. **Manage Subscription**:
   - As existing subscriber, visit pricing page
   - Click "Manage subscription & billing"
   - Verify Stripe Portal opens
   - Test plan changes, cancellation

## FAQ

**Q: How do I change pricing without redeploying?**
A: Update prices in the Stripe Dashboard. Changes appear instantly in the Pricing Table.

**Q: Can users switch between monthly and yearly?**
A: Yes, through the Stripe customer portal (accessible via "Manage billing" button).

**Q: How do 100% off coupons work?**
A: Stripe creates a $0 subscription without collecting payment info. User gets immediate access.

**Q: What if I add a new pricing tier?**
A: Add the product in Stripe, set the `tier` metadata, add it to your Pricing Table. No code changes needed.

**Q: How does the backend know which tier a price belongs to?**
A: It reads the `metadata.tier` field from the Stripe Price object. Set this to `basic` or `pro` in the Stripe Dashboard.
