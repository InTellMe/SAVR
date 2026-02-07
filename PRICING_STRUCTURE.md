# SAVR Pricing Structure

## Overview

SAVR has a simple two-tier pricing model:
- **Free**: Perfect for getting started
- **Pro**: Unlimited access with monthly or yearly billing

## Tiers

### Free Tier (Always Free)

**Cost**: $0 forever

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

### Pro Tier

**Cost**: 
- **Monthly**: $9.99/month
- **Yearly**: $99/year (save $20 = ~$8.25/month)

**Features**:
- Everything in Free tier
- **Unlimited inventory items**
- **Unlimited AI recipes**
- **Unlimited meal plans**
- **Unlimited pet recipes**
- **AI cooking assistant chat**
- Ad-free experience
- Cancel anytime

## Stripe Configuration

### Environment Variables

You need to set these environment variables:

#### For Server-Side (Cloud Functions):
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_YEARLY=price_...
```

#### For Client-Side (Next.js Web App):
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY=price_...
```

### Creating Stripe Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Click "Add Product"

**Pro Monthly Product**:
- Name: SAVR Pro Monthly
- Description: Unlimited inventory, recipes, meal plans, and AI cooking assistant
- Price: $9.99 USD
- Billing: Monthly recurring
- Copy the Price ID → Use as `STRIPE_PRICE_ID_PRO_MONTHLY`

**Pro Yearly Product**:
- Name: SAVR Pro Yearly
- Description: Unlimited inventory, recipes, meal plans, and AI cooking assistant
- Price: $99 USD
- Billing: Yearly recurring
- Copy the Price ID → Use as `STRIPE_PRICE_ID_PRO_YEARLY`

## Feature Gates

Feature gating is implemented in the codebase:

### Usage Limits (functions/src/types/index.ts)

```typescript
export const TIER_LIMITS = {
  free: {
    maxInventoryItems: 50,
    maxRecipesPerMonth: 10,
    maxMealPlansPerMonth: 2,
    maxPetRecipesPerMonth: 5,
    aiChatEnabled: false,
  },
  pro: {
    maxInventoryItems: -1,  // unlimited
    maxRecipesPerMonth: -1,  // unlimited
    maxMealPlansPerMonth: -1,  // unlimited
    maxPetRecipesPerMonth: -1,  // unlimited
    aiChatEnabled: true,
  },
};
```

### Where Limits Are Enforced

1. **Cloud Functions** (`functions/src/utils/subscription.ts`):
   - `checkUsageLimit()` validates limits before operations
   - Returns error messages prompting users to upgrade

2. **Firestore Rules** (`firestore.rules`):
   - `isPaidTier()` helper checks for pro subscription
   - Used to gate access to certain features

3. **Client-Side UI**:
   - Web: `web/contexts/AuthContext.tsx` - `isPaidTier()` helper
   - Mobile: `mobile/src/types/index.ts` - `isPaidTier()` helper
   - UI components check tier and show upgrade prompts

## Legacy Tier Migration

The codebase handles legacy tier names automatically:

| Legacy Tier | Maps To |
|-------------|---------|
| `basic`     | `free`  |
| `plus`      | `pro`   |
| `premium`   | `pro`   |

**Why this matters**: Existing users with `plus` or `premium` tiers will automatically be treated as `pro` users. No database migration needed.

## Testing Subscriptions

### Test Mode

Use Stripe test mode for development:
- Test publishable key: `pk_test_...`
- Test secret key: `sk_test_...`
- Test card: `4242 4242 4242 4242` (any future date, any CVC)

### Webhook Testing

For local development:
```bash
stripe listen --forward-to http://localhost:5001/YOUR_PROJECT/us-central1/stripeWebhook
```

Use the webhook signing secret from the CLI output.

## FAQ

**Q: Can users switch between monthly and yearly?**
A: Yes, through the Stripe customer portal. They can manage their subscription, change plans, or cancel.

**Q: What happens when a Pro subscription is cancelled?**
A: User retains Pro access until the end of their billing period, then automatically downgrades to Free tier.

**Q: Do Pro users keep their data when downgrading?**
A: Yes, all data is retained. They just can't add more items/recipes until within Free tier limits or they upgrade again.

**Q: Is there a grace period for failed payments?**
A: Stripe handles retries automatically. Users marked as `past_due` are treated as Free tier until payment succeeds.

## Support

For pricing questions:
- Users: Contact support through the app
- Developers: See `DEPLOYMENT.md` and `API.md` for technical details
