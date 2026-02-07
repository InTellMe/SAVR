# SAVR Pricing Structure

## Overview

SAVR has a two-tier paid subscription model with coupon code support:
- **Basic**: Affordable entry point with essential features
- **Pro**: Unlimited access with advanced features

**All plans support coupon codes** - you can use a 100% discount coupon to get free access!

## Tiers

### Basic Tier (Paid)

**Cost**: 
- **Monthly**: $5.99/month
- **Yearly**: $69.99/year (save ~$2/year)

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

1. **Enter Coupon at Checkout**: Stripe checkout includes a promotion code field
2. **Automatic Discount**: Coupon is validated and applied by Stripe
3. **$0 Checkout**: If the coupon results in a $0.00 total:
   - Payment information is **not collected**
   - User gets immediate access
   - Subscription is still tracked in Stripe

### Implementation Details

**Stripe Configuration**:
```typescript
stripe.checkout.sessions.create({
  // ... other params
  allow_promotion_codes: true,  // Enable coupon field
  payment_method_collection: 'if_required',  // Skip payment for $0 totals
});
```

**Creating Coupons in Stripe**:
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

### Environment Variables

#### For Server-Side (Cloud Functions):
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASIC_MONTHLY=price_...
STRIPE_PRICE_ID_BASIC_YEARLY=price_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_YEARLY=price_...
```

#### For Client-Side (Next.js Web App):
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY=price_...
```

## Testing Coupons

1. Create a test coupon in Stripe Dashboard (Test mode)
2. At checkout, enter the coupon code
3. Verify discount is applied
4. For 100% off coupons:
   - Verify payment form is not shown
   - Verify subscription is still created
   - Verify user gets correct tier access

## FAQ

**Q: Can users switch between monthly and yearly?**
A: Yes, through the Stripe customer portal.

**Q: How do 100% off coupons work?**
A: Stripe creates a $0 subscription without collecting payment info. User gets immediate access.

**Q: Can coupons be limited to specific plans?**
A: Yes, configure which products/prices a coupon applies to in Stripe Dashboard.
