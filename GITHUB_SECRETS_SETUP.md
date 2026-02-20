# GitHub Secrets Setup Guide for SAVR Deployment

**Complete Reference**: All GitHub Actions secrets and environment variables for SAVR web and mobile deployments

---

## Prerequisites

Before configuring secrets, ensure you have:
- [ ] Admin access to the InTellMe/SAVR repository
- [ ] Access to Firebase Console for your project
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Stripe Dashboard access (for Stripe keys)
- [ ] Expo account (for mobile builds): https://expo.dev
- [ ] Google Play Console access (for Android app submission)

---

## Step 1: Access GitHub Secrets

**Important**: This guide uses GitHub **Environments** for the Firebase deployment secrets.
The workflow requires an environment named exactly `Production` (with capital P).

### For Firebase Deployment Secrets (Environment-scoped):
1. Navigate to: https://github.com/GooseyPrime/SAVR/settings/environments
2. Or: Repository → Settings → Environments
3. Create or select the `Production` environment (exact name, capital P)
4. Click "Add secret" or "Environment secrets" to add secrets to this environment

### For Mobile Build Secrets (Repository-level):
1. Navigate to: https://github.com/GooseyPrime/SAVR/settings/secrets/actions
2. Or: Repository → Settings → Secrets and variables → Actions → Repository secrets

---

## Step 2: Choose Firebase Authentication Method

The Firebase Deploy workflow supports two authentication methods. **Choose ONE**:

### Method A: Token-Based Authentication (Recommended for Quick Setup)

The `FIREBASE_TOKEN` provides quick authentication for CI/CD deployments.

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login and generate CI token
firebase login:ci
```

**Output will look like:**
```
Visit this URL on this device to log in:
https://accounts.google.com/o/oauth2/auth...

Waiting for authentication...

✔  Success! Use this token to login on a CI server:

1//0gABCDEFGHIJKLMNOPQRSTUVWXYZ...
```

**Copy the token** (the long string starting with `1//0g...`) for later use.

### Method B: Service Account Authentication (Recommended for Production)

Service account JSON provides more secure, granular authentication for production CI/CD.

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your SAVR project
3. Click the gear icon (⚙️) → Project Settings → Service Accounts
4. Click "Generate new private key"
5. Confirm by clicking "Generate key"
6. A JSON file will be downloaded to your computer
7. Open the JSON file with a text editor
8. **Copy the entire JSON content** (not the file path) - you'll add it as `FIREBASE_SERVICE_ACCOUNT_JSON` secret

**Important**: Keep this JSON file secure and never commit it to version control.

**You only need ONE of these methods** - the workflow will automatically detect which one is available.

---

## Step 3: Get Firebase Configuration Values

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your SAVR project
3. Click the gear icon (⚙️) → Project Settings
4. Scroll down to "Your apps" section
5. Click on your Web app (or add one if none exists)
6. You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

**Note down each value** - you'll need them in Step 5.

---

## Step 4: Get Stripe Publishable Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to: Developers → API keys
3. Copy the **Publishable key** (starts with `pk_live_` for production or `pk_test_` for testing)

---

## Step 5: Get Expo Token (for Mobile Builds)

The mobile build workflow requires an Expo access token.

1. Go to https://expo.dev
2. Log in to your Expo account (or create one)
3. Navigate to: Account Settings → Access Tokens
4. Click "Create Token"
5. Give it a name (e.g., "GitHub Actions SAVR Mobile")
6. Copy the generated token

---

## Step 6: Get Google Play Service Account Key (for Mobile Submission)

To automatically submit builds to Google Play Store:

1. Go to [Google Play Console](https://play.google.com/console/)
2. Select your app (or create it)
3. Navigate to: Setup → API access
4. Click "Create new service account"
5. Follow the link to Google Cloud Console
6. Create a service account with "Service Account User" role
7. Download the JSON key file
8. Back in Play Console, grant the service account "Release Manager" permissions
9. **Important**: Open the JSON file and copy its **entire contents** (not the file path)

---

## Step 7: Add All Secrets to GitHub

**IMPORTANT: Firebase deployment secrets must be added to the `Production` Environment, NOT repository secrets!**

### Adding Environment Secrets (for Firebase Deployment)

For Firebase-related secrets (Steps 2-11 below):
1. Go to: Repository → Settings → Environments → `Production`
2. Click "Add secret" under "Environment secrets"
3. Enter the **Name** (exactly as shown, case-sensitive)
4. Paste the **Value**
5. Click "Add secret"

### Adding Repository Secrets (for Mobile Builds)

For Mobile-related secrets (Steps 12-13 below):
1. Go to: Repository → Settings → Secrets and variables → Actions → Repository secrets
2. Click "New repository secret"
3. Enter the **Name** and **Value**
4. Click "Add secret"

---

### 🔥 Firebase Deployment Secrets (Add to Production Environment)

#### Secret 1: FIREBASE_TOKEN (if using Method A from Step 2)
- **Name**: `FIREBASE_TOKEN`
- **Value**: Token from Step 2, Method A (the long string starting with `1//0g...`)
- **Used by**: `firebase-deploy.yml` workflow
- **Sensitive**: ✅ Yes - keep private
- **Required**: ⚠️ Only if NOT using FIREBASE_SERVICE_ACCOUNT_JSON

#### Secret 1B: FIREBASE_SERVICE_ACCOUNT_JSON (if using Method B from Step 2)
- **Name**: `FIREBASE_SERVICE_ACCOUNT_JSON`
- **Value**: Complete JSON content from Step 2, Method B (entire service account key file)
- **Used by**: `firebase-deploy.yml` workflow
- **Sensitive**: ✅ Yes - keep private
- **Required**: ⚠️ Only if NOT using FIREBASE_TOKEN
- **Note**: If both are configured, the workflow will prefer FIREBASE_SERVICE_ACCOUNT_JSON

#### Secret 2: FIREBASE_PROJECT_ID
- **Name**: `FIREBASE_PROJECT_ID`
- **Value**: Your Firebase project ID (e.g., `savr-production-123`)
- **Used by**: `firebase-deploy.yml` workflow
- **Sensitive**: ⚠️ Project identifier (typically not sensitive but should be in secrets)

### 🔧 Firebase Configuration (Public - Safe for Client-Side)

These Firebase config values are **public** and will be visible in browser JavaScript and mobile apps. They are safe to expose.

#### Secret 3: NEXT_PUBLIC_FIREBASE_API_KEY
- **Name**: `NEXT_PUBLIC_FIREBASE_API_KEY`
- **Value**: `apiKey` from Firebase config in Step 3
- **Used by**: Both `firebase-deploy.yml` and `mobile-build.yml` workflows
- **Sensitive**: ❌ No - public config (Firebase API key is designed to be public)

#### Secret 4: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- **Name**: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- **Value**: `authDomain` from Firebase config in Step 3
- **Used by**: Both `firebase-deploy.yml` and `mobile-build.yml` workflows
- **Sensitive**: ❌ No - public config

#### Secret 5: NEXT_PUBLIC_FIREBASE_PROJECT_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- **Value**: `projectId` from Firebase config in Step 3
- **Used by**: Both `firebase-deploy.yml` and `mobile-build.yml` workflows
- **Sensitive**: ❌ No - public config

#### Secret 6: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- **Name**: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- **Value**: `storageBucket` from Firebase config in Step 3
- **Used by**: Both `firebase-deploy.yml` and `mobile-build.yml` workflows
- **Sensitive**: ❌ No - public config

#### Secret 7: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- **Value**: `messagingSenderId` from Firebase config in Step 3
- **Used by**: Both `firebase-deploy.yml` and `mobile-build.yml` workflows
- **Sensitive**: ❌ No - public config

#### Secret 8: NEXT_PUBLIC_FIREBASE_APP_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_APP_ID`
- **Value**: `appId` from Firebase config in Step 3
- **Used by**: Both `firebase-deploy.yml` and `mobile-build.yml` workflows
- **Sensitive**: ❌ No - public config

### 💳 Stripe Configuration

#### Secret 9: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- **Name**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Value**: Stripe publishable key from Step 4 (starts with `pk_live_` or `pk_test_`)
- **Used by**: `firebase-deploy.yml` workflow
- **Sensitive**: ❌ No - public config (Stripe publishable keys are designed to be public)

#### Secret 10: NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID
- **Name**: `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`
- **Value**: Stripe Pricing Table ID (starts with `prctbl_...`)
- **How to get**:
  1. Go to [Stripe Dashboard → Products → Pricing Tables](https://dashboard.stripe.com/products/pricing-tables)
  2. Create or select your pricing table
  3. Copy the Pricing Table ID from the embed code
- **Used by**: `firebase-deploy.yml` workflow
- **Sensitive**: ❌ No - public config

### 🌐 Application Configuration

#### Secret 11: NEXT_PUBLIC_APP_URL
- **Name**: `NEXT_PUBLIC_APP_URL`
- **Value**: Your production URL (e.g., `https://savr.cam`)
- **Used by**: `firebase-deploy.yml` workflow
- **Sensitive**: ❌ No - public config

### 📱 Mobile Build & Submission Secrets (Add to Repository Secrets)

#### Secret 12: EXPO_TOKEN
- **Name**: `EXPO_TOKEN`
- **Value**: Expo access token from Step 5
- **Used by**: `mobile-build.yml` workflow
- **Sensitive**: ✅ Yes - keep private

#### Secret 13: GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
- **Name**: `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`
- **Value**: Complete JSON contents of the Google Play service account key file from Step 6
- **Used by**: `mobile-build.yml` workflow (exported as `GOOGLE_SERVICE_ACCOUNT_KEY` in submission step)
- **Sensitive**: ✅ Yes - keep private (contains credentials for Google Play API access)

---

## Step 8: Verify All Secrets Are Added

After adding all secrets, verify they are correctly configured:

### In the Production Environment (11 Firebase secrets)
Navigate to: Repository → Settings → Environments → Production → Environment secrets

You should see:
- ✅ FIREBASE_TOKEN (or FIREBASE_SERVICE_ACCOUNT_JSON)
- ✅ FIREBASE_PROJECT_ID
- ✅ NEXT_PUBLIC_FIREBASE_API_KEY
- ✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- ✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID
- ✅ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- ✅ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- ✅ NEXT_PUBLIC_FIREBASE_APP_ID
- ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- ✅ NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID
- ✅ NEXT_PUBLIC_APP_URL

### In Repository Secrets (2 Mobile secrets)
Navigate to: Repository → Settings → Secrets and variables → Actions → Repository secrets

You should see:
- ✅ EXPO_TOKEN
- ✅ GOOGLE_PLAY_SERVICE_ACCOUNT_KEY

---

## Step 9: Trigger a Deployment

### Option A: Re-run Failed Workflow
1. Go to: https://github.com/InTellMe/SAVR/actions
2. Click on the most recent "Firebase Deploy" run
3. Click "Re-run all jobs"

### Option B: Push a Change
```bash
git commit --allow-empty -m "Trigger deployment after secrets configuration"
git push origin main
```

### Option C: Push to Main Branch
Make any small change to a file on main branch (or merge a PR), which will automatically trigger deployment.

---

## Step 10: Verify Deployment

1. **Watch the workflow**:
   - Go to: https://github.com/InTellMe/SAVR/actions
   - Click on the running "Firebase Deploy" workflow
   - Verify it progresses through steps (not startup_failure anymore)

2. **Check for success**:
   - Wait for workflow to complete
   - Verify status shows ✅ green checkmark

3. **Test production site**:
   - Visit your production URL
   - Check for PR #46 features:
     - Navigate to `/faq` - new FAQ page should load
     - Check pricing page - should show "Start 5-Day Free Trial"
     - Test the subscription flow

---

## Troubleshooting

### Still Getting startup_failure?
- **Verify Environment Name**: Ensure you added Firebase secrets to the `Production` Environment (capital P), NOT to repository secrets
- Double-check all secret names are **exactly** as shown (case-sensitive)
- Ensure no extra spaces in secret values
- Verify you have admin access to the repository
- For mobile builds, verify EXPO_TOKEN is valid (check at https://expo.dev)
- Check that the workflow file has `environment: Production` in the deploy job

### Workflow starts but fails during build?
- Good news: secrets are working!
- Check the workflow logs for specific error messages
- Common issues:
  - Invalid Firebase token (regenerate with `firebase login:ci`)
  - Incorrect project ID
  - Build errors in code (check build logs)
  - For mobile: Invalid EXPO_TOKEN or missing Firebase config

### Cannot find firebase project?
- Verify `FIREBASE_PROJECT_ID` matches your actual Firebase project ID
- In Firebase Console, check: Project Settings → General → Project ID

### Mobile build fails?
- Verify EXPO_TOKEN is valid (test with `eas whoami`)
- Check that all NEXT_PUBLIC_FIREBASE_* secrets are correctly set
- For submission failures: verify GOOGLE_PLAY_SERVICE_ACCOUNT_KEY contains valid JSON
- Ensure the service account has proper permissions in Google Play Console

---

## Security Notes

### Public vs Private Secrets

**Public Configuration (Safe to Expose)**:
- **NEXT_PUBLIC_* secrets**: These are **intentionally public** and will be visible in browser JavaScript and compiled mobile apps. They are safe to use client-side.
  - Firebase config values (API key, auth domain, project ID, etc.) are designed by Google to be public
  - Stripe publishable key is designed to be public
  - App URL is public information
- These values are protected by Firebase security rules and Stripe's backend validation

**Sensitive Secrets (Keep Private)**:
- **FIREBASE_TOKEN**: CI/CD deployment token - never share or commit to code
- **EXPO_TOKEN**: Expo account access token - keep private
- **GOOGLE_PLAY_SERVICE_ACCOUNT_KEY**: Contains credentials for Google Play API - highly sensitive

### Secret Rotation
If you need to rotate secrets (e.g., if a token is compromised):
1. Generate new token/key from the source (Firebase, Expo, Google Play Console)
2. In GitHub Secrets, click the secret name
3. Click "Update secret"
4. Paste new value and save
5. For FIREBASE_TOKEN: `firebase login:ci`
6. For EXPO_TOKEN: Generate new token at https://expo.dev/accounts/[account]/settings/access-tokens
7. For GOOGLE_PLAY_SERVICE_ACCOUNT_KEY: Create new service account and revoke old one

---

## Complete Checklist

Use this checklist to verify setup:

### Firebase Deployment Setup
- [ ] Installed Firebase CLI
- [ ] Generated Firebase token with `firebase login:ci`
- [ ] Collected all Firebase config values from Console
- [ ] Got Stripe publishable key
- [ ] Added all 10 Firebase deployment secrets to GitHub repository

### Mobile Build Setup (if deploying mobile app)
- [ ] Created Expo account at https://expo.dev
- [ ] Generated EXPO_TOKEN and added to GitHub secrets
- [ ] Set up Google Play Console and service account
- [ ] Downloaded and added GOOGLE_PLAY_SERVICE_ACCOUNT_KEY to GitHub secrets
- [ ] Verified all NEXT_PUBLIC_FIREBASE_* secrets are set (used by both web and mobile)

### Verification
- [ ] Verified all secret names are correct (case-sensitive)
- [ ] Triggered a new deployment
- [ ] Watched workflow complete successfully
- [ ] Verified production site has new changes

---

## Quick Reference Tables

### GitHub Actions Secrets (Required for CI/CD)

| Secret Name | Used By | Source | Sensitive | Example Format |
|------------|---------|--------|-----------|----------------|
| **FIREBASE_TOKEN** | firebase-deploy.yml | `firebase login:ci` | ✅ Yes | `1//0gABCD...` |
| **FIREBASE_PROJECT_ID** | firebase-deploy.yml | Firebase Console | ⚠️ ID | `savr-prod-123` |
| **EXPO_TOKEN** | mobile-build.yml | Expo Dashboard | ✅ Yes | `abc123...` |
| **GOOGLE_PLAY_SERVICE_ACCOUNT_KEY** | mobile-build.yml (submit) | Google Play Console | ✅ Yes | `{"type":"service_account",...}` |
| **NEXT_PUBLIC_FIREBASE_API_KEY** | Both workflows | Firebase Web Config | ❌ No | `AIzaSyABC...` |
| **NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN** | Both workflows | Firebase Web Config | ❌ No | `project.firebaseapp.com` |
| **NEXT_PUBLIC_FIREBASE_PROJECT_ID** | Both workflows | Firebase Web Config | ❌ No | `savr-prod-123` |
| **NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET** | Both workflows | Firebase Web Config | ❌ No | `project.appspot.com` |
| **NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID** | Both workflows | Firebase Web Config | ❌ No | `123456789012` |
| **NEXT_PUBLIC_FIREBASE_APP_ID** | Both workflows | Firebase Web Config | ❌ No | `1:123:web:abc` |
| **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** | firebase-deploy.yml | Stripe Dashboard | ❌ No | `pk_live_...` or `pk_test_...` |
| **NEXT_PUBLIC_APP_URL** | firebase-deploy.yml | Your Domain | ❌ No | `https://savr.cam` |

**Total: 12 GitHub Secrets Required**

### Workflow-Specific Secret Mapping

**firebase-deploy.yml** (Web App Deployment):
- Requires 10 secrets: FIREBASE_TOKEN, FIREBASE_PROJECT_ID, and all 8 NEXT_PUBLIC_* vars

**mobile-build.yml** (Mobile App Build & Submit):
- Requires 8 secrets for builds: EXPO_TOKEN + 6 NEXT_PUBLIC_FIREBASE_* vars (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID)
- Additional 1 secret for submission: GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
- **Note**: Mobile workflow uses `EXPO_PUBLIC_*` prefix in environment variables, but sources values from `NEXT_PUBLIC_*` GitHub secrets

---

## Need Help?

- **Deployment docs**: See `DEPLOYMENT.md` in repository root
- **Troubleshooting**: See `DEPLOYMENT_TROUBLESHOOTING.md`
- **Firebase docs**: https://firebase.google.com/docs/cli
- **GitHub Actions docs**: https://docs.github.com/en/actions
- **Expo EAS docs**: https://docs.expo.dev/build/introduction/

---

## Appendix: Runtime Environment Variables

These environment variables are **NOT** GitHub secrets. They are configured directly in Firebase Functions and local development environments.

### Firebase Functions Environment Variables

Configure these in Firebase using:
```bash
firebase functions:config:set key="value"
```

Or add to your local `.env` file (based on `.env.example`):

| Variable Name | Required | Sensitive | Description | Example |
|--------------|----------|-----------|-------------|---------|
| **OPENAI_API_KEY** | ✅ Yes | ✅ Yes | OpenAI API key for GPT-4 and Vision | `sk-...` |
| **GOOGLE_CLOUD_VISION_API_KEY** | ❌ Optional | ✅ Yes | Google Vision API fallback | `AIza...` |
| **STRIPE_SECRET_KEY** | ✅ Yes | ✅ Yes | Stripe secret key for payments | `sk_live_...` or `sk_test_...` |
| **STRIPE_WEBHOOK_SECRET** | ✅ Yes | ✅ Yes | Stripe webhook signing secret | `whsec_...` |
| **NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID** | ✅ Yes | ❌ No | Stripe Pricing Table ID for subscription UI | `prctbl_...` |
| **NEXT_PUBLIC_APP_URL** | ✅ Yes | ❌ No | Base URL for Stripe redirects | `https://savr.cam` |
| **All NEXT_PUBLIC_FIREBASE_*** | ✅ Yes | ❌ No | Firebase config (inherited from build) | See above |

**Note**: The NEXT_PUBLIC_* variables are also needed at build time (via GitHub secrets) and are automatically included in the deployed application.

### Mobile App Environment Variables

Configure these in `mobile/.env` (based on `mobile/.env.example`):

| Variable Name | Required | Sensitive | Description | Example |
|--------------|----------|-----------|-------------|---------|
| **EXPO_PUBLIC_FIREBASE_API_KEY** | ✅ Yes | ❌ No | Firebase API key (maps to NEXT_PUBLIC) | `AIzaSyABC...` |
| **EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN** | ✅ Yes | ❌ No | Firebase auth domain | `project.firebaseapp.com` |
| **EXPO_PUBLIC_FIREBASE_PROJECT_ID** | ✅ Yes | ❌ No | Firebase project ID | `savr-prod-123` |
| **EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET** | ✅ Yes | ❌ No | Firebase storage bucket | `project.appspot.com` |
| **EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID** | ✅ Yes | ❌ No | Firebase messaging sender ID | `123456789012` |
| **EXPO_PUBLIC_FIREBASE_APP_ID** | ✅ Yes | ❌ No | Firebase app ID | `1:123:web:abc` |
| **EXPO_PUBLIC_GOOGLE_CLIENT_ID** | ✅ Yes | ❌ No | Google OAuth Web Client ID | `*.apps.googleusercontent.com` |
| **EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID** | ✅ Yes | ❌ No | Google OAuth iOS Client ID | `*.apps.googleusercontent.com` |
| **EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID** | ✅ Yes | ❌ No | Google OAuth Android Client ID | `*.apps.googleusercontent.com` |

**Important Notes**:
- Mobile app uses `EXPO_PUBLIC_*` prefix (not `NEXT_PUBLIC_*`)
- During CI/CD builds, GitHub secrets with `NEXT_PUBLIC_*` names are mapped to `EXPO_PUBLIC_*` environment variables
- Google OAuth client IDs are obtained from [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
- You need 3 separate OAuth client IDs: one for Web, one for iOS, and one for Android

### Local Development Setup

1. **Web app** (`/web`):
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

2. **Mobile app** (`/mobile`):
   ```bash
   cp mobile/.env.example mobile/.env
   # Edit mobile/.env with your values
   ```

3. **Firebase Functions** (`/functions`):
   ```bash
   # Set via Firebase CLI
   firebase functions:config:set openai.api_key="your_key"
   
   # Or for local development, functions will read from root .env file
   ```

---

**Last Updated**: February 2026  
**Version**: 2.0.0  
**Coverage**: Web deployment + Mobile build & submission
