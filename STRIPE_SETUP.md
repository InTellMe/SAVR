# Stripe Subscription Setup Guide

This guide explains how to set up Stripe subscriptions for SAVR's pricing tiers.

## SAVR Pricing Tiers

SAVR has three subscription tiers:

### 1. Basic (Free)
- **Price**: Free forever
- **Features**: 50 inventory items, 10 recipes/month, 2 meal plans/month
- **Stripe Setup**: None required (free tier)

### 2. Plus ($7.99/month)
- **Price**: $7.99 per month
- **Features**: Unlimited inventory, recipes, meal plans, AI chat assistant
- **Stripe Price ID Variable**: `STRIPE_PRICE_ID_PLUS` and `NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS`

### 3. Premium ($14.99/month)
- **Price**: $14.99 per month
- **Features**: Everything in Plus + real-time cooking coach, priority support
- **Stripe Price ID Variable**: `STRIPE_PRICE_ID_PREMIUM` and `NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM`

## Creating Stripe Products

### Step 1: Create Products in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Click "Add Product"

#### Create Plus Tier Product

1. **Product Name**: SAVR Plus
2. **Description**: Unlimited inventory, recipes, meal plans, and AI cooking assistant
3. **Pricing**:
   - Type: Recurring
   - Price: $7.99 USD
   - Billing period: Monthly
4. Click "Save product"
5. **Copy the Price ID** (starts with `price_...`)

#### Create Premium Tier Product

1. **Product Name**: SAVR Premium
2. **Description**: Everything in Plus plus real-time cooking coach and priority support
3. **Pricing**:
   - Type: Recurring
   - Price: $14.99 USD
   - Billing period: Monthly
4. Click "Save product"
5. **Copy the Price ID** (starts with `price_...`)

### Step 2: Configure Environment Variables

Add the copied Price IDs to your environment configuration:

#### For Local Development (`.env.local`)

```bash
# Stripe Price IDs
STRIPE_PRICE_ID_PLUS=price_1234567890abcdef
NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS=price_1234567890abcdef

STRIPE_PRICE_ID_PREMIUM=price_0987654321fedcba
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM=price_0987654321fedcba
```

#### For Cloud Functions (Google Cloud Console)

Set these environment variables in Google Cloud Console → Cloud Functions:

- `STRIPE_PRICE_ID_PLUS`: The Plus tier price ID
- `STRIPE_PRICE_ID_PREMIUM`: The Premium tier price ID

#### For Web Application (Firebase Hosting)

These are set in your deployment environment or GitHub Actions secrets:

- `NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS`
- `NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM`

## Environment Variable Naming Explained

### Why Two Variables Per Tier?

- **`STRIPE_PRICE_ID_PLUS`** (no prefix): Used in Cloud Functions (server-side)
- **`NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS`** (with prefix): Used in Next.js web app (client-side)

Next.js only exposes environment variables prefixed with `NEXT_PUBLIC_` to the browser. This ensures:
- Server-side code can access all Stripe price IDs
- Client-side code can only access the public price IDs (not secret keys)

## Historical Note: Pro Monthly/Yearly

If you see references to `STRIPE_PRICE_ID_PRO_MONTHLY` or `STRIPE_PRICE_ID_PRO_YEARLY` in old documentation:

- **These are outdated** and no longer used
- The original plan had "Pro" tier with monthly and yearly options
- Current implementation uses "Plus" and "Premium" tiers, both monthly
- All references have been updated to use PLUS and PREMIUM

## Testing Subscriptions

### Test Mode

1. Use Stripe test mode keys (start with `pk_test_` and `sk_test_`)
2. Use test card: `4242 4242 4242 4242`
3. Any future expiration date and any 3-digit CVC

### Webhook Testing

1. Use Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to localhost:5001/your-project/us-central1/stripeWebhook
   ```
2. Use the webhook signing secret from Stripe CLI output

## Troubleshooting

### "Price not found" errors

- Verify the Price ID is correct (copy from Stripe Dashboard)
- Ensure you're using the correct Stripe account (test vs live)
- Check that the price is active in Stripe Dashboard

### Subscription not activating

- Check webhook is configured correctly
- Verify webhook signing secret is set
- Check Cloud Functions logs for webhook errors

### Wrong tier assigned

- The tier is determined by the Price ID in `functions/src/services/stripe.ts`
- Ensure Price IDs match between Stripe Dashboard and environment variables

## Further Resources

- [Stripe Subscriptions Documentation](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [SAVR Deployment Guide](./DEPLOYMENT.md)
