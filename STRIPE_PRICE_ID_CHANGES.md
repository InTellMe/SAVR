# Summary of Stripe Price ID Changes

## What Was The Problem?

The repository had inconsistent naming for Stripe price IDs:

1. **Documentation** (`.env.example`, `DEPLOYMENT.md`) referenced:
   - `STRIPE_PRICE_ID_PRO_MONTHLY`
   - `STRIPE_PRICE_ID_PRO_YEARLY`

2. **Actual code** (`functions/src/services/stripe.ts`, `web/app/pricing/page.tsx`) used:
   - `STRIPE_PRICE_ID_PLUS`
   - `STRIPE_PRICE_ID_PREMIUM`

This caused confusion about:
- Which environment variables to set
- How many pricing tiers exist
- Whether there are monthly and yearly options

## What Changed?

### Files Modified

1. **`.env.example`**
   - ✅ Removed: `STRIPE_PRICE_ID_PRO_MONTHLY` and `STRIPE_PRICE_ID_PRO_YEARLY`
   - ✅ Kept: `STRIPE_PRICE_ID_PLUS` and `STRIPE_PRICE_ID_PREMIUM`
   - ✅ Added explanatory comments for each tier

2. **`DEPLOYMENT.md`**
   - ✅ Updated Stripe setup section to use Plus ($7.99) and Premium ($14.99)
   - ✅ Removed references to Pro Monthly/Yearly
   - ✅ Added clear instructions for which environment variables to set

3. **`API.md`**
   - ✅ Updated code example to use `NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS`
   - ✅ Added comment showing Premium option

4. **`web/app/pricing/page.tsx`**
   - ✅ Cleaned up fallback logic (removed `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY`)
   - ✅ Simplified to only check for PLUS and PREMIUM variables

5. **`STRIPE_SETUP.md`** (NEW)
   - ✅ Created comprehensive guide explaining the entire pricing structure
   - ✅ Documented why there are two variables per tier (server vs client)
   - ✅ Provided step-by-step Stripe setup instructions

## Current Pricing Structure

SAVR now has **three clearly defined tiers**:

1. **Basic (Free)**: $0 forever
   - 50 inventory items, 10 recipes/month, 2 meal plans/month

2. **Plus**: $7.99/month
   - Unlimited inventory, recipes, meal plans, AI chat
   - Variables: `STRIPE_PRICE_ID_PLUS` and `NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS`

3. **Premium**: $14.99/month
   - Everything in Plus + real-time cooking coach, priority support
   - Variables: `STRIPE_PRICE_ID_PREMIUM` and `NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM`

## Environment Variables to Set

### For Local Development (`.env.local`):
```bash
STRIPE_PRICE_ID_PLUS=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS=price_xxxxx
STRIPE_PRICE_ID_PREMIUM=price_yyyyy
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM=price_yyyyy
```

### For Cloud Functions (Google Cloud Console):
```bash
STRIPE_PRICE_ID_PLUS=price_xxxxx
STRIPE_PRICE_ID_PREMIUM=price_yyyyy
```

### For Next.js Build (GitHub Actions/Firebase):
```bash
NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM=price_yyyyy
```

## Why Two Variables Per Tier?

- **`STRIPE_PRICE_ID_PLUS`**: Used in Cloud Functions (server-side only)
- **`NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS`**: Used in Next.js web app (publicly accessible)

Next.js requires the `NEXT_PUBLIC_` prefix to expose variables to the browser.

## Migration Notes

If you have existing deployments:

1. ✅ **No code changes needed** - The code already uses PLUS/PREMIUM
2. ✅ **Update your environment variables** - Rename PRO_MONTHLY → PLUS, remove PRO_YEARLY
3. ✅ **Update your Stripe dashboard** - Ensure products match the new naming
4. ✅ **No database migration needed** - Existing subscriptions continue to work

## References

- See `STRIPE_SETUP.md` for detailed Stripe configuration guide
- See `DEPLOYMENT.md` for full deployment instructions
- See `API.md` for API usage examples
