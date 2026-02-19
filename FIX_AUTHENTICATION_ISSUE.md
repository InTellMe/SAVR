# How to Fix the Stripe Checkout Authentication Issue

## The Problem You're Experiencing

You mentioned that after completing the Stripe checkout process with a 5-day free trial, the app doesn't recognize that you've subscribed. The checkout process completes successfully (as shown in the HAR files), but the subscription status isn't being updated in the app.

## Root Cause

After analyzing your HAR files and code, I identified the issue:

**The Firebase Functions runtime secrets are not configured in Google Cloud Secret Manager.**

While you have properly set up GitHub Actions secrets in the "Production" environment, these are only used during the build/deployment process. The webhook function that processes Stripe events needs **runtime secrets** configured in Google Cloud Secret Manager, which is separate from GitHub Actions secrets.

### Here's what's happening:

1. ✅ User goes to pricing page
2. ✅ Stripe Pricing Table loads with correct `client_reference_id` (your user UID: cZ8Awzdus4VXKnkTj2g60vvYmFI2)
3. ✅ User completes checkout successfully  
4. ✅ Stripe sends webhook to your Cloud Function
5. ❌ **Cloud Function fails because `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are not available at runtime**
6. ❌ User document is never updated with subscription status

## The Solution

You need to configure the Stripe secrets in Google Cloud Secret Manager so they're available to Firebase Functions at runtime.

### Option 1: Automated Setup (Recommended)

I've created a setup script that will configure everything for you:

```bash
# Navigate to your project directory
cd /path/to/SAVR

# Run the setup script
./setup-stripe-secrets.sh
```

The script will:
1. Verify your Firebase project is active
2. Prompt you to enter your Stripe secret key and webhook secret
3. Create the secrets in Google Cloud Secret Manager
4. Optionally configure IAM permissions
5. Optionally redeploy your functions

### Option 2: Manual Setup

If you prefer to set up manually, follow the guide in `STRIPE_SECRETS_SETUP_GUIDE.md`:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login and select your project
firebase login
firebase use <your-project-id>

# Set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_SECRET_KEY
# When prompted, paste your Stripe secret key (from https://dashboard.stripe.com/apikeys)

# Set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# When prompted, paste your webhook secret (from https://dashboard.stripe.com/webhooks)

# Redeploy functions
firebase deploy --only functions
```

## Where to Find Your Stripe Secrets

### 1. STRIPE_SECRET_KEY
1. Go to: https://dashboard.stripe.com/apikeys
2. Find "Secret key" section
3. Click "Reveal live key token" (or use test key for testing)
4. Copy the key (starts with `sk_live_` or `sk_test_`)

### 2. STRIPE_WEBHOOK_SECRET  
1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint (should be `https://us-central1-<project-id>.cloudfunctions.net/stripeWebhook`)
3. Under "Signing secret", click "Reveal"
4. Copy the secret (starts with `whsec_`)

## Verifying the Fix

After setting up the secrets and redeploying:

### 1. Check the Health Endpoint

Visit: `https://us-central1-<your-project-id>.cloudfunctions.net/stripeWebhookHealth`

You should see a response like:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-19T...",
  "secrets": {
    "STRIPE_SECRET_KEY": {
      "configured": true,
      "length": 107,
      "prefix": "sk_live"
    },
    "STRIPE_WEBHOOK_SECRET": {
      "configured": true,
      "length": 32,
      "prefix": "whsec_"
    }
  },
  "message": "All Stripe secrets are configured correctly"
}
```

### 2. Test a Webhook

In Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook
3. Click "Send test webhook"
4. Select event: `checkout.session.completed`
5. Click "Send test webhook"

You should see a `200` response with `{"received":true}`

### 3. Complete a Test Checkout

1. Log in to https://savr.cam
2. Go to https://savr.cam/pricing
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. After checkout, check your user profile - subscription should now show as active

### 4. Check Firebase Functions Logs

```bash
firebase functions:log --only stripeWebhook --lines 50
```

Look for:
- ✅ `🔔 Stripe webhook endpoint called`
- ✅ `✅ Stripe secrets are available`
- ✅ `🔔 Received Stripe webhook: checkout.session.completed`
- ✅ `✅ Checkout session has claimed user ID`
- ✅ `✅ Email validation passed`
- ✅ `🔗 Immediately linking Stripe customer`
- ✅ `✅ Verified: User status correctly set to 'active'`

## Key Differences Between Secret Types

| Aspect | GitHub Actions Secrets | Firebase Functions Secrets |
|--------|----------------------|---------------------------|
| **Purpose** | Build-time configuration | Runtime configuration |
| **Location** | GitHub Repository Settings → Environments → Production | Google Cloud Secret Manager |
| **Used by** | Next.js build process, deployment scripts | Cloud Functions at runtime |
| **Examples** | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `FIREBASE_TOKEN` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Visibility** | Only during CI/CD | Only to specific Cloud Functions |
| **How to set** | GitHub UI or API | `firebase functions:secrets:set` or `gcloud secrets create` |

## What I Changed

To help you debug and fix this issue, I made the following improvements:

1. **Enhanced Webhook Logging** (`functions/src/index.ts`)
   - Added checks to verify secrets are available before processing webhooks
   - Added detailed error messages if secrets are missing
   - Added logging to show which secrets are configured

2. **Health Check Endpoint** (`stripeWebhookHealth`)
   - New Cloud Function to verify secret configuration
   - Shows which secrets are configured and their prefixes
   - Accessible without authentication for easy testing

3. **Setup Script** (`setup-stripe-secrets.sh`)
   - Automated script to configure secrets
   - Includes IAM permission setup
   - Guides you through the entire process

4. **Comprehensive Guide** (`STRIPE_SECRETS_SETUP_GUIDE.md`)
   - Detailed explanation of the issue
   - Step-by-step instructions
   - Troubleshooting tips
   - Security best practices

## Next Steps

1. **Run the setup script** or manually configure secrets
2. **Redeploy your functions**: `firebase deploy --only functions` (or push to main to trigger GitHub Actions)
3. **Test the health endpoint** to verify configuration
4. **Complete a test checkout** to verify subscription sync works
5. **Check the logs** to confirm webhook processing

## Support

If you encounter any issues:

1. Check the health endpoint first
2. Review Firebase Functions logs
3. Verify your webhook is properly configured in Stripe Dashboard
4. See `STRIPE_SECRETS_SETUP_GUIDE.md` for detailed troubleshooting

## Why This Wasn't Working Before

The `stripeWebhook` function in `functions/src/index.ts` has this configuration:

```typescript
export const stripeWebhook = onRequest(
  {
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    // ...
  },
```

This tells Firebase Functions v2 that it needs these secrets from Google Cloud Secret Manager. When the secrets aren't available:
- The webhook endpoint receives the request from Stripe
- It tries to verify the webhook signature but can't find `STRIPE_WEBHOOK_SECRET`
- The function throws an error
- The webhook fails with a 400 or 500 error
- Your user document is never updated
- The app doesn't recognize the subscription

With the secrets properly configured, the webhook will:
- ✅ Receive the Stripe event
- ✅ Verify the signature using `STRIPE_WEBHOOK_SECRET`
- ✅ Process the event and update your user document
- ✅ Set `subscriptionStatus` to `'active'` or `'trialing'`
- ✅ The app will immediately recognize the subscription via the real-time listener

---

**This should completely resolve your authentication issue!** The checkout process was working fine - it was just the webhook processing that was failing due to missing runtime secrets.
