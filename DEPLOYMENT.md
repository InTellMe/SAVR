# Deployment Guide for PantryHustler

This guide covers deploying the PantryHustler application to production.

## Prerequisites

- Firebase project created and configured
- Firebase CLI installed: `npm install -g firebase-tools`
- Domain configured: pantryhustler.com
- API keys obtained:
  - OpenAI API key
  - Google Cloud Vision API (optional, for fallback)
  - Stripe API keys
  - PayPal API keys (optional)

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name it "pantryhustler" or similar
4. Enable Google Analytics (optional)

### 1.2 Enable Firebase Services

**Authentication:**
1. Go to Authentication → Sign-in methods
2. Enable Email/Password
3. Enable Google
4. Add authorized domains: `pantryhustler.com`

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
4. Register app with nickname "Pantry Chef Web"
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
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_YEARLY=price_...

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret

# App
NEXT_PUBLIC_APP_URL=https://pantryhustler.com
```

### 2.2 Cloud Functions

Set Firebase environment variables:

```bash
firebase functions:config:set \
  openai.key="sk-..." \
  stripe.secret="sk_live_..." \
  stripe.webhook_secret="whsec_..." \
  google.vision_key="your_key"
```

Or use Google Cloud Secret Manager (recommended for production).

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

This will deploy all 9 Cloud Functions:
- analyzeImage
- createRecipe
- createMealPlan
- createGroceryList
- chat
- createStripeCheckout
- createStripePortal
- stripeWebhook
- onUserCreate

## Step 6: Build and Deploy Web Application

### 6.1 Configure Next.js for Static Export

Update `/web/next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
```

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

## Step 7: Configure Custom Domain

### 7.1 Add Custom Domain in Firebase

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter: `pantryhustler.com`
4. Follow verification steps

### 7.2 Update DNS Records

Add these DNS records at your domain provider:

```
Type: A
Name: pantrychef
Value: [Firebase IP address from console]

Type: TXT
Name: pantrychef
Value: [Verification code from Firebase]
```

### 7.3 Wait for SSL Certificate

Firebase will automatically provision an SSL certificate. This can take up to 24 hours.

## Step 8: Configure Stripe

### 8.1 Create Products and Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to Products → Add Product
3. Create "Pantry Chef Pro Monthly":
   - Name: Pantry Chef Pro
   - Price: $9.99/month
   - Recurring: Monthly
   - Copy Price ID
4. Create "Pantry Chef Pro Yearly":
   - Name: Pantry Chef Pro
   - Price: $99/year
   - Recurring: Yearly
   - Copy Price ID

### 8.2 Configure Webhook

1. Go to Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://us-central1-your-project.cloudfunctions.net/stripeWebhook`
3. Select events:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_failed
4. Copy webhook signing secret
5. Add to Firebase Functions config

## Step 9: Test the Deployment

### 9.1 Test Web Application

1. Visit `https://pantryhustler.com`
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
- [ ] Pro tier features gated server-side

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

1. Check DNS propagation: `dig pantryhustler.com`
2. Verify in Firebase Console
3. Wait up to 24 hours for SSL certificate

## Support

For deployment issues, contact:
- Firebase Support: https://firebase.google.com/support
- InTellMe Dev Team: internal

---

**Last Updated**: February 2026
**Version**: 1.0.0
