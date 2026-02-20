# Stripe Secrets Setup Guide

## Problem

If you're experiencing issues where users complete Stripe checkout but the app doesn't recognize their subscription, the likely cause is that **Firebase Functions secrets are not properly configured in Google Cloud Secret Manager**.

## Understanding the Two Types of Secrets

### 1. GitHub Actions Secrets (for Deployment)
- Located in: Repository Settings → Environments → Production → Secrets
- Used during: Build and deployment process
- Examples: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`
- These are injected into the web app at build time

### 2. Firebase Functions Runtime Secrets (for Webhooks)
- Located in: Google Cloud Secret Manager
- Used during: Runtime execution of Cloud Functions
- Examples: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- These are required for the webhook endpoint to process Stripe events

## The Critical Issue

The `stripeWebhook` function in `/functions/src/index.ts` is configured like this:

```typescript
export const stripeWebhook = onRequest(
  {
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    // ...
  },
```

This means Firebase Functions v2 expects these secrets to be available in **Google Cloud Secret Manager**, not just as GitHub Actions secrets.

## How to Fix It

### Step 1: Verify Google Cloud Secret Manager Setup

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Select your Firebase project
3. Navigate to: Security → Secret Manager
4. Check if the following secrets exist:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

### Step 2: Create Secrets (if missing)

Using Firebase CLI (recommended):

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Set your project
firebase use <your-project-id>

# Create STRIPE_SECRET_KEY secret
firebase functions:secrets:set STRIPE_SECRET_KEY
# When prompted, paste your Stripe secret key (starts with sk_live_ or sk_test_)

# Create STRIPE_WEBHOOK_SECRET secret
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# When prompted, paste your Stripe webhook secret (starts with whsec_)
```

Alternatively, using gcloud CLI:

```bash
# Install gcloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set your project
gcloud config set project <your-project-id>

# Create STRIPE_SECRET_KEY secret
echo -n "sk_live_your_secret_key" | gcloud secrets create STRIPE_SECRET_KEY --data-file=-

# Create STRIPE_WEBHOOK_SECRET secret
echo -n "whsec_your_webhook_secret" | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-
```

### Step 3: Grant Access to Firebase Functions

Firebase Functions need permission to access these secrets:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe <your-project-id> --format="value(projectNumber)")

# Grant access to STRIPE_SECRET_KEY
gcloud secrets add-iam-policy-binding STRIPE_SECRET_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding STRIPE_SECRET_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to STRIPE_WEBHOOK_SECRET
gcloud secrets add-iam-policy-binding STRIPE_WEBHOOK_SECRET \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding STRIPE_WEBHOOK_SECRET \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 4: Redeploy Firebase Functions

After setting up the secrets, you must redeploy your functions:

```bash
# Deploy functions only
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

Or push to main branch to trigger GitHub Actions deployment.

### Step 5: Verify Webhook is Working

1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Find your webhook endpoint (should be something like `https://us-central1-<project-id>.cloudfunctions.net/stripeWebhook`)
3. Click "Send test webhook"
4. Select event type: `checkout.session.completed`
5. Check the response - should be `200 OK` with `{"received":true}`

## Where to Find Your Stripe Secrets

### STRIPE_SECRET_KEY
1. Go to: https://dashboard.stripe.com/apikeys
2. Under "Secret key", click "Reveal live key token" (or use test key for testing)
3. Copy the key (starts with `sk_live_` or `sk_test_`)

### STRIPE_WEBHOOK_SECRET
1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Under "Signing secret", click "Reveal"
4. Copy the secret (starts with `whsec_`)

## Common Mistakes

❌ **Only setting secrets in GitHub Actions**
- GitHub Actions secrets are for build-time only
- Runtime secrets must be in Google Cloud Secret Manager

❌ **Using NEXT_PUBLIC_* for backend secrets**
- NEXT_PUBLIC_* secrets are public and embedded in the web app
- Backend secrets like STRIPE_SECRET_KEY must never use this prefix

❌ **Forgetting to redeploy after setting secrets**
- Functions must be redeployed to pick up new secret configurations
- Simply setting the secret is not enough

## Testing the Fix

After completing the setup:

1. **Test the webhook endpoint directly:**
   ```bash
   curl -X POST https://us-central1-<project-id>.cloudfunctions.net/stripeWebhook
   # Should return error about missing signature (proves endpoint is accessible)
   ```

2. **Complete a test checkout:**
   - Go to your pricing page
   - Use Stripe test card: 4242 4242 4242 4242
   - Complete checkout
   - Check Firebase Functions logs for webhook processing:
     ```bash
     firebase functions:log --only stripeWebhook
     ```
   - Look for: `🔔 Processing checkout.session.completed webhook`

3. **Check user document in Firestore:**
   - Go to Firebase Console → Firestore
   - Find the user document
   - Verify `subscriptionStatus` is `'active'` or `'trialing'`
   - Verify `stripeCustomerId` is set

## Still Having Issues?

### Check Firebase Functions Logs

```bash
# View recent logs
firebase functions:log --only stripeWebhook --lines 50

# Or in Firebase Console
# Go to: Functions → stripeWebhook → Logs
```

Look for errors like:
- `Stripe webhook secret not configured` → Secret is not set in Secret Manager
- `Invalid signature` → Webhook secret doesn't match what's in Stripe
- `No user ID found in checkout session` → client_reference_id not being passed

### Enable Debug Logging

The webhook handler already has extensive logging. Check for these messages:

- ✅ `Checkout session has claimed user ID` → UID was received
- ✅ `Email validation passed` → User identity verified
- ✅ `Immediately linking Stripe customer` → Customer being linked
- ✅ `Verified: User status correctly set` → Status update confirmed
- ❌ `No user ID found in checkout session` → UID not passed from frontend
- ❌ `User not found in Firestore` → User document doesn't exist
- ❌ `Email mismatch` → Email validation failed

## Additional Resources

- [Firebase Functions Secrets Documentation](https://firebase.google.com/docs/functions/config-env#secret-manager)
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager/docs)
