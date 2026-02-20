# Deployment Guide for SAVR

This guide covers deploying the SAVR application to production.

## Prerequisites

- Firebase project created and configured
- Firebase CLI installed: `npm install -g firebase-tools`
- Domain configured: savr.cam (with www redirect)
- API keys obtained:
  - OpenAI API key
  - Google Cloud Vision API (optional, for fallback)
  - Stripe API keys

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name it "savr" or similar
4. Enable Google Analytics (optional)

### 1.2 Enable Firebase Services

**Authentication:**

1. Go to Authentication → Sign-in methods
2. Enable Email/Password
3. Enable Google
4. Add authorized domains: `savr.cam`, `www.savr.cam`

**Firestore:**

1. Go to Firestore Database
2. Create database in production mode
3. Select region (e.g., us-central1)

**Storage:**

1. Go to Storage
2. Get started
3. Select same region as Firestore

**Hosting:**

1. Go to Hosting
2. Get started
3. Note the hosting URL

### 1.3 Get Firebase Configuration

1. Go to Project Settings → General
2. Scroll to "Your apps"
3. Click "Web" (</>) to add a web app
4. Register app with nickname "SAVR Web"
5. Copy the firebaseConfig object
6. Repeat for mobile if needed

## Step 2: Environment Configuration

### 2.1 Web Application

Create `/web/.env.local`:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create these in Stripe Dashboard → Products)
# Basic Monthly: $5.99/month
STRIPE_PRICE_ID_BASIC_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY=price_...

# Basic Yearly: $69.99/year
STRIPE_PRICE_ID_BASIC_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_YEARLY=price_...

# Pro Monthly: $9.99/month
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY=price_...

# Pro Yearly: $99.99/year
STRIPE_PRICE_ID_PRO_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY=price_...

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret

# App
NEXT_PUBLIC_APP_URL=https://savr.cam
```

### 2.2 Cloud Functions

Cloud Functions read `process.env`. Set these **once** in Google Cloud (the deployment workflow does not inject them; secrets stay in GCP).

**Where to set:** Google Cloud Console → Cloud Functions → select each function (or the same env can be set for all) → Edit → Runtime, build, connections and security → Environment variables → Add each name/value.

**Required variables:**

| Variable                | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `OPENAI_API_KEY`        | OpenAI API                                      |
| `STRIPE_SECRET_KEY`     | Stripe API                                      |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification                     |
| `NEXT_PUBLIC_APP_URL`   | Redirect/base URL (e.g. `https://savr.cam`) |

**Optional (have defaults in code):** `OPENAI_MODEL_*`, `OPENAI_MODEL_VISION_*`, etc. (see `functions/src/services/ai.ts`).

### 2.3 Mobile Application

Create `/mobile/.env`:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:ios:xyz789
```

## Step 3: Deploy Firestore Rules and Indexes

```bash
# From project root
firebase deploy --only firestore
```

Verify in Firebase Console that rules are deployed.

## Step 4: Deploy Storage Rules

```bash
firebase deploy --only storage
```

## Step 5: Build and Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

This will deploy all Cloud Functions including:

- analyzeImage, createRecipe, createMealPlan, createGroceryList, chat
- createStripeCheckout, createStripePortal, stripeWebhook
- createPayPalCheckout, paypalWebhook
- onUserCreate
- (dataset labeling: uploadLabelingImage, getImageAnnotations, saveAnnotation, triggerSegmentation, exportDataset)

## Step 6: Build and Deploy Web Application

### 6.1 Static export

Static export is configured in `web/next.config.ts` (`output: 'export'`). No change needed.

### 6.2 Build the Web App

```bash
cd web
npm install
npm run build
```

This creates `/web/out` directory with static files.

### 6.3 Deploy to Firebase Hosting

```bash
cd ..
firebase deploy --only hosting
```

## Deployment workflow (GitHub Actions)

A workflow in `.github/workflows/firebase-deploy.yml` deploys Hosting, Functions, Firestore, and Storage on every push to `main`.

**Trigger:** Push to `main`.

**Required GitHub Secrets (in Production Environment):**

The workflow uses the `Production` GitHub Environment (capital P). All secrets below must be configured in:
`Repository → Settings → Environments → Production → Environment secrets`

- `FIREBASE_TOKEN` — from `firebase login:ci` (run locally once, paste into environment secrets).
  OR `FIREBASE_SERVICE_ACCOUNT_JSON` — service account key JSON from Firebase Console
- `FIREBASE_PROJECT_ID` — your Firebase project ID.
- All web build-time vars (same names as in `web/.env.example`):
  - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`, `NEXT_PUBLIC_APP_URL`

**Note:** Cloud Functions environment variables are **not** set by the workflow. Configure them once in Google Cloud Console (see Step 2.2).

## Step 7: Configure Custom Domain (savr.cam)

### 7.1 Add custom domain in Firebase

1. Go to Firebase Console → Hosting
2. Click "Add custom domain" (or "Connect domain")
3. Enter: `savr.cam` (primary domain)
4. Add `www.savr.cam` as well (automatically redirects to primary)

### 7.2 DNS records

At your domain provider, add the records Firebase shows:

- **TXT** (verification): host usually `www` or `_acme-challenge.www`, value from Firebase
- **A**: for `www` (and optionally root), use the IPs Firebase provides

### 7.3 SSL

Firebase provisions SSL automatically. Propagation can take from a few minutes up to 24 hours.

## Step 8: Configure Stripe

### 8.1 Create Products and Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to Products → Add Product
3. Create "SAVR Basic Monthly":
   - Name: SAVR Basic Monthly
   - Price: $5.99/month
   - Recurring: Monthly
   - Copy Price ID → Use as STRIPE_PRICE_ID_BASIC_MONTHLY
4. Create "SAVR Basic Yearly":
   - Name: SAVR Basic Yearly
   - Price: $69.99/year
   - Recurring: Yearly
   - Copy Price ID → Use as STRIPE_PRICE_ID_BASIC_YEARLY
5. Create "SAVR Pro Monthly":
   - Name: SAVR Pro Monthly
   - Price: $9.99/month
   - Recurring: Monthly
   - Copy Price ID → Use as STRIPE_PRICE_ID_PRO_MONTHLY
6. Create "SAVR Pro Yearly":
   - Name: SAVR Pro Yearly
   - Price: $99.99/year
   - Recurring: Yearly
   - Copy Price ID → Use as STRIPE_PRICE_ID_PRO_YEARLY

### 8.2 Configure Stripe Webhook

1. Go to Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook`
3. Select events:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_failed
4. Copy webhook signing secret
5. Set in Google Cloud Console as `STRIPE_WEBHOOK_SECRET` for your functions

### 8.3 Configure PayPal Webhook

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/) → Your app → Webhooks
2. Add webhook URL: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/paypalWebhook`
3. Subscribe to events, e.g.:
   - BILLING.SUBSCRIPTION.ACTIVATED
   - BILLING.SUBSCRIPTION.CANCELLED
   - BILLING.SUBSCRIPTION.SUSPENDED
   - BILLING.SUBSCRIPTION.RE-ACTIVATED
   - PAYMENT.SALE.DENIED (optional, for payment failures)
4. Copy the Webhook ID and set it as `PAYPAL_WEBHOOK_ID` in Google Cloud Console (Cloud Functions environment variables)

## Step 9: Test the Deployment

### 9.1 Test Web Application

1. Visit `https://savr.cam` (or `https://www.savr.cam` - should redirect)
2. Sign up with a test account
3. Upload a test image
4. Generate a recipe
5. Test subscription flow with Stripe test mode

### 9.2 Test Cloud Functions

```bash
firebase functions:log --only analyzeImage
```

Check logs for errors.

### 9.3 Test Authentication

1. Sign up with email
2. Sign in with Google
3. Verify user document created in Firestore

## Step 10: Mobile App Deployment

### 10.1 Build for iOS

```bash
cd mobile
eas build --platform ios
```

Submit to App Store.

### 10.2 Build for Android

```bash
eas build --platform android
```

Submit to Play Store.

## Monitoring and Maintenance

### Cloud Functions Monitoring

```bash
# View logs
firebase functions:log

# View specific function
firebase functions:log --only createRecipe
```

### Firestore Monitoring

Check Firebase Console → Firestore → Usage tab

### Error Tracking

Consider adding:

- Sentry for error tracking
- Firebase Crashlytics for mobile
- Google Analytics for usage

## Rollback Procedures

### Rollback Functions

```bash
firebase functions:rollback functionName
```

### Rollback Hosting

```bash
firebase hosting:rollback
```

## Security Checklist

- [ ] All API keys stored in environment variables
- [ ] Firestore rules deployed and tested
- [ ] Storage rules deployed and tested
- [ ] HTTPS enforced (automatic with Firebase Hosting)
- [ ] CORS configured for Cloud Functions
- [ ] Rate limiting implemented
- [ ] Input validation in all Cloud Functions
- [ ] Stripe webhook signature verification enabled
- [ ] Pro tier features gated server-side (entitlements from Firestore only; subscription fields updated by webhooks only)

## Performance Optimization

### Web App

- [ ] Enable Next.js Image Optimization (if not using static export)
- [ ] Implement caching strategies
- [ ] Lazy load components
- [ ] Optimize images before upload

### Cloud Functions

- [ ] Use appropriate memory allocation
- [ ] Set reasonable timeouts
- [ ] Implement caching where possible
- [ ] Monitor cold starts

## Cost Optimization

### Firebase

- Free tier includes:
  - 50K document reads/day
  - 20K document writes/day
  - 10 GB hosting transfer/month
  - 125K function invocations/month

### OpenAI

- Monitor token usage
- Consider caching common responses
- Implement rate limiting per user

### Stripe

- 2.9% + $0.30 per successful card charge

## Troubleshooting

### Build Errors

```bash
# Clear caches
cd web
rm -rf .next node_modules
npm install
npm run build

cd ../functions
rm -rf lib node_modules
npm install
npm run build
```

### Function Deployment Errors

```bash
# Check logs
firebase functions:log

# Redeploy specific function
firebase deploy --only functions:analyzeImage
```

### Domain Not Working

1. Check DNS propagation: `dig savr.cam` or `dig www.savr.cam`
2. Verify in Firebase Console
3. Wait up to 24 hours for SSL certificate

### Firebase Configuration Error in Browser Console

**Error:** `Uncaught Error: Missing Firebase configuration for NEXT_PUBLIC_FIREBASE_API_KEY`

**Cause:** Firebase environment variables were not set during the build process. The Next.js static export requires these variables at build time to be baked into the static files.

**Solution:**

1. **For GitHub Actions deployment:** Ensure all required secrets are set in repository Settings → Secrets and variables → Actions:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_APP_URL`

2. **For local deployment:** Create `web/.env.local` with all required variables (see Step 2.1)

3. **Verify the build:** After setting secrets, trigger a new deployment by pushing to `main` branch

**Note:** The application will now gracefully handle missing Firebase configuration by showing a warning in the console instead of crashing, but Firebase features will not work until proper configuration is deployed.

## Support

For deployment issues, contact:

- Firebase Support: https://firebase.google.com/support
- GooseyPrime Dev Team: internal

---

**Last Updated**: February 2026
**Version**: 1.0.0
