# GitHub Secrets Setup Guide for SAVR Deployment

**Complete Reference**: All GitHub Actions secrets and environment variables for SAVR web and mobile deployments

---

## Prerequisites

Before configuring secrets, ensure you have:
- [ ] Admin access to the GooseyPrime/SAVR repository
- [ ] Access to Vercel account and project
- [ ] Access to Supabase Dashboard for your project
- [ ] Stripe Dashboard access (for Stripe keys)
- [ ] Expo account (for mobile builds): https://expo.dev
- [ ] Google Play Console access (for Android app submission)

---

## Step 1: Access GitHub Secrets

**Important**: This guide uses GitHub **Environments** for deployment secrets.
The workflow requires an environment named exactly `Production` (with capital P).

### For Deployment Secrets (Environment-scoped):
1. Navigate to: https://github.com/GooseyPrime/SAVR/settings/environments
2. Or: Repository → Settings → Environments
3. Create or select the `Production` environment (exact name, capital P)
4. Click "Add secret" or "Environment secrets" to add secrets to this environment

### For Mobile Build Secrets (Repository-level):
1. Navigate to: https://github.com/GooseyPrime/SAVR/settings/secrets/actions
2. Or: Repository → Settings → Secrets and variables → Actions → Repository secrets

---

## Step 2: Get Vercel Configuration

### Vercel Token
1. Go to https://vercel.com/account/tokens
2. Create a new token with full access
3. Copy the token - you'll need it as `VERCEL_TOKEN`

### Vercel Organization and Project IDs
1. Go to your Vercel project settings → General
2. Copy the **Organization ID** - you'll need it as `VERCEL_ORG_ID`
3. Copy the **Project ID** - you'll need it as `VERCEL_PROJECT_ID`

Alternatively, run `vercel link` in your web directory and check `.vercel/project.json`

---

## Step 3: Get Supabase Configuration Values

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your SAVR project
3. Navigate to: Project Settings → API
4. You'll see:
   - **Project URL** - use as `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon/Public key** - use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role key** - use as `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)
5. For migrations:
   - **Project Ref** (from dashboard URL, e.g., `abcdefghijk`) - use as `SUPABASE_PROJECT_REF`
   - **Database Password** (set when creating project) - use as `SUPABASE_DB_PASSWORD`

---

## Step 4: Get Stripe Publishable Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to: Developers → API keys
3. Copy the **Publishable key** (starts with `pk_live_` for production or `pk_test_` for testing)
4. Copy the **Pricing Table ID** from: Products → Pricing Tables (starts with `prctbl_...`)

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

## Step 6: Get Google OAuth Client IDs (for Mobile)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: APIs & Services → Credentials
3. Create OAuth 2.0 Client IDs for:
   - Web application (for general use)
   - iOS application
   - Android application
4. Copy each client ID - you'll need them for mobile builds

---

## Step 7: Get Google Play Service Account Key (for Mobile Submission)

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

## Step 8: Add All Secrets to GitHub

**IMPORTANT: Different secrets go in different locations!**

- **Vercel secrets** (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID) → **Repository Secrets** (used by both production and preview deployments)
- **Supabase & Stripe secrets** → **Production Environment Secrets** (for production deployments only)
- **Mobile build secrets** → **Repository Secrets** (for mobile builds)

### Adding Repository Secrets

For Vercel and Mobile secrets:
1. Go to: Repository → Settings → Secrets and variables → Actions → Repository secrets
2. Click "New repository secret"
3. Enter the **Name** (exactly as shown, case-sensitive)
4. Paste the **Value**
5. Click "Add secret"

### Adding Environment Secrets (for Production Deployments)

For deployment-related secrets (Supabase, Stripe, etc.):
1. Go to: Repository → Settings → Environments → `Production`
2. Click "Add secret" under "Environment secrets"
3. Enter the **Name** (exactly as shown, case-sensitive)
4. Paste the **Value**
5. Click "Add secret"

---

### 🚀 Vercel Deployment Secrets (Add to Repository Secrets)

**Why Repository Secrets?** These are used by both production (`vercel-deploy.yml`) and preview (`preview-deploy.yml`) workflows. The preview workflow doesn't use an environment, so these must be repository-level secrets.

#### Secret 1: VERCEL_TOKEN
- **Name**: `VERCEL_TOKEN`
- **Value**: Token from Step 2 (Vercel account tokens page)
- **Location**: Repository Secrets
- **Used by**: `vercel-deploy.yml` and `preview-deploy.yml` workflows
- **Sensitive**: ✅ Yes - keep private
- **Required**: ✅ Yes

#### Secret 2: VERCEL_ORG_ID
- **Name**: `VERCEL_ORG_ID`
- **Value**: Organization ID from Vercel project settings
- **Location**: Repository Secrets
- **Used by**: `vercel-deploy.yml` and `preview-deploy.yml` workflows
- **Sensitive**: ⚠️ Project identifier
- **Required**: ✅ Yes

#### Secret 3: VERCEL_PROJECT_ID
- **Name**: `VERCEL_PROJECT_ID`
- **Value**: Project ID from Vercel project settings
- **Location**: Repository Secrets
- **Used by**: `vercel-deploy.yml` and `preview-deploy.yml` workflows
- **Sensitive**: ⚠️ Project identifier
- **Required**: ✅ Yes

### 🗄️ Supabase Configuration

**Note:** Supabase public keys (NEXT_PUBLIC_*) need to be in BOTH locations:
- **Production Environment** (for production deployments with `vercel-deploy.yml`)
- **Repository Secrets** (for preview deployments with `preview-deploy.yml` and mobile builds with `mobile-build.yml`)

#### Secret 4: NEXT_PUBLIC_SUPABASE_URL
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: Project URL from Supabase Dashboard → Project Settings → API
- **Location**: Production Environment AND Repository Secrets
- **Used by**: All deployment workflows (`vercel-deploy.yml`, `preview-deploy.yml`, `mobile-build.yml`)
- **Sensitive**: ❌ No - public config (Supabase URL is designed to be public)
- **Required**: ✅ Yes

#### Secret 5: NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Anon/Public key from Supabase Dashboard → Project Settings → API
- **Location**: Production Environment AND Repository Secrets
- **Used by**: All deployment workflows (`vercel-deploy.yml`, `preview-deploy.yml`, `mobile-build.yml`)
- **Sensitive**: ❌ No - public config (Anon key is designed to be public, protected by RLS)
- **Required**: ✅ Yes

#### Secret 6: SUPABASE_SERVICE_ROLE_KEY
- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Service Role key from Supabase Dashboard → Project Settings → API
- **Location**: Production Environment only
- **Used by**: Backend API routes and server-side operations (production only)
- **Sensitive**: ✅ Yes - keep private! (bypasses RLS)
- **Required**: ✅ Yes

#### Secret 7: SUPABASE_PROJECT_REF
- **Name**: `SUPABASE_PROJECT_REF`
- **Value**: Project reference ID from Supabase Dashboard URL (e.g., `abcdefghijk`)
- **Location**: Production Environment only
- **Used by**: `vercel-deploy.yml` for database migrations (production only)
- **Sensitive**: ⚠️ Project identifier
- **Required**: ✅ Yes (for migrations)

#### Secret 8: SUPABASE_DB_PASSWORD
- **Name**: `SUPABASE_DB_PASSWORD`
- **Value**: Database password set when creating the Supabase project
- **Location**: Production Environment only
- **Used by**: `vercel-deploy.yml` for database migrations (production only)
- **Sensitive**: ✅ Yes - keep private
- **Required**: ✅ Yes (for migrations)

### 💳 Stripe Configuration

**Note:** Stripe public keys (NEXT_PUBLIC_*) need to be in BOTH locations:
- **Production Environment** (for production deployments)
- **Repository Secrets** (for preview deployments)

#### Secret 9: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- **Name**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Value**: Stripe publishable key from Step 4 (starts with `pk_live_` or `pk_test_`)
- **Location**: Production Environment AND Repository Secrets
- **Used by**: `vercel-deploy.yml` and `preview-deploy.yml` workflows
- **Sensitive**: ❌ No - public config (Stripe publishable keys are designed to be public)
- **Required**: ✅ Yes

#### Secret 10: NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID
- **Name**: `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`
- **Value**: Stripe Pricing Table ID (starts with `prctbl_...`)
- **Location**: Production Environment AND Repository Secrets
- **How to get**:
  1. Go to [Stripe Dashboard → Products → Pricing Tables](https://dashboard.stripe.com/products/pricing-tables)
  2. Create or select your pricing table
  3. Copy the Pricing Table ID from the embed code
- **Used by**: `vercel-deploy.yml` and `preview-deploy.yml` workflows
- **Sensitive**: ❌ No - public config
- **Required**: ✅ Yes

#### Secret 11: STRIPE_SECRET_KEY
- **Name**: `STRIPE_SECRET_KEY`
- **Value**: Stripe secret key from Stripe Dashboard → Developers → API keys
- **Location**: Production Environment only
- **Used by**: Backend API routes for payment processing (production only)
- **Sensitive**: ✅ Yes - keep private!
- **Required**: ✅ Yes

#### Secret 12: STRIPE_WEBHOOK_SECRET
- **Name**: `STRIPE_WEBHOOK_SECRET`
- **Value**: Webhook signing secret from Stripe Dashboard → Developers → Webhooks
- **Location**: Production Environment only
- **Used by**: Backend API routes for webhook verification (production only)
- **Sensitive**: ✅ Yes - keep private!
- **Required**: ✅ Yes

### 🌐 Application Configuration

#### Secret 13: NEXT_PUBLIC_APP_URL
- **Name**: `NEXT_PUBLIC_APP_URL`
- **Value**: Your production URL (e.g., `https://savr.cam`)
- **Location**: Production Environment only
- **Used by**: `vercel-deploy.yml` workflow (production only)
- **Sensitive**: ❌ No - public config
- **Required**: ✅ Yes

### 📱 Mobile Build & Submission Secrets (Add to Repository Secrets)

#### Secret 14: EXPO_TOKEN
- **Name**: `EXPO_TOKEN`
- **Value**: Expo access token from Step 5
- **Used by**: `mobile-build.yml` workflow
- **Sensitive**: ✅ Yes - keep private
- **Required**: ✅ Yes

#### Secret 15: EXPO_PUBLIC_GOOGLE_CLIENT_ID
- **Name**: `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- **Value**: Google OAuth Web Client ID from Step 6
- **Used by**: `mobile-build.yml` workflow
- **Sensitive**: ❌ No - public config
- **Required**: ✅ Yes (for Google Sign-In)

#### Secret 16: EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
- **Name**: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- **Value**: Google OAuth iOS Client ID from Step 6
- **Used by**: `mobile-build.yml` workflow
- **Sensitive**: ❌ No - public config
- **Required**: ✅ Yes (for Google Sign-In on iOS)

#### Secret 17: EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
- **Name**: `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- **Value**: Google OAuth Android Client ID from Step 6
- **Used by**: `mobile-build.yml` workflow
- **Sensitive**: ❌ No - public config
- **Required**: ✅ Yes (for Google Sign-In on Android)

#### Secret 18: GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
- **Name**: `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`
- **Value**: Complete JSON contents of the Google Play service account key file from Step 7
- **Used by**: `mobile-build.yml` workflow (exported as `GOOGLE_SERVICE_ACCOUNT_KEY` in submission step)
- **Sensitive**: ✅ Yes - keep private (contains credentials for Google Play API access)
- **Required**: ✅ Yes (for automatic app submission)

---

## Step 9: Verify All Secrets Are Added

After adding all secrets, verify they are correctly configured:

### In Repository Secrets (12 secrets)
Navigate to: Repository → Settings → Secrets and variables → Actions → Repository secrets

You should see:
- ✅ VERCEL_TOKEN
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- ✅ NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID
- ✅ EXPO_TOKEN
- ✅ EXPO_PUBLIC_GOOGLE_CLIENT_ID
- ✅ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
- ✅ EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
- ✅ GOOGLE_PLAY_SERVICE_ACCOUNT_KEY

### In Production Environment (10 secrets)
Navigate to: Repository → Settings → Environments → Production → Environment secrets

You should see:
- ✅ NEXT_PUBLIC_SUPABASE_URL (duplicate of repository secret)
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY (duplicate of repository secret)
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ SUPABASE_PROJECT_REF
- ✅ SUPABASE_DB_PASSWORD
- ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (duplicate of repository secret)
- ✅ NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID (duplicate of repository secret)
- ✅ STRIPE_SECRET_KEY
- ✅ STRIPE_WEBHOOK_SECRET
- ✅ NEXT_PUBLIC_APP_URL

**Note:** Some secrets appear in both locations because they're used by different workflows with different scopes.

---

## Step 10: Trigger a Deployment

### Option A: Re-run Failed Workflow
1. Go to: https://github.com/GooseyPrime/SAVR/actions
2. Click on the most recent workflow run
3. Click "Re-run all jobs"

### Option B: Push a Change
```bash
git commit --allow-empty -m "Trigger deployment after secrets configuration"
git push origin main
```

### Option C: Push to Main Branch
Make any small change to a file on main branch (or merge a PR), which will automatically trigger deployment.

---

## Step 11: Verify Deployment

1. **Watch the workflow**:
   - Go to: https://github.com/GooseyPrime/SAVR/actions
   - Click on the running workflow (Vercel Deployment or CI)
   - Verify it progresses through steps successfully

2. **Check for success**:
   - Wait for workflow to complete
   - Verify status shows ✅ green checkmark

3. **Test production site**:
   - Visit your production URL
   - Verify the site is working correctly
   - Test authentication and subscription features

---

## Troubleshooting

### Still Getting startup_failure?
- **Verify Secret Locations**: 
  - Vercel secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID) must be in **Repository Secrets**
  - Supabase/Stripe public keys should be in BOTH **Repository Secrets** AND **Production Environment**
  - Supabase/Stripe private keys should be in **Production Environment** only
- Double-check all secret names are **exactly** as shown (case-sensitive)
- Ensure no extra spaces in secret values
- Verify you have admin access to the repository
- For mobile builds, verify EXPO_TOKEN is valid (check at https://expo.dev)
- Check that the workflow file has `environment: Production` in the deploy job (for production deployments)

### Workflow starts but fails during build?
- Good news: secrets are working!
- Check the workflow logs for specific error messages
- Common issues:
  - Invalid Vercel token (regenerate from Vercel dashboard)
  - Incorrect Vercel organization or project ID
  - Build errors in code (check build logs)
  - For mobile: Invalid EXPO_TOKEN or missing Supabase config

### Cannot connect to Vercel?
- Verify `VERCEL_TOKEN` is valid and has not expired
- Verify `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` match your Vercel project
- Check that the Vercel project is linked to the correct GitHub repository

### Mobile build fails?
- Verify EXPO_TOKEN is valid (test with `eas whoami`)
- Check that all NEXT_PUBLIC_SUPABASE_* secrets are correctly set
- Verify Google OAuth client IDs are configured for the correct Google Cloud project
- For submission failures: verify GOOGLE_PLAY_SERVICE_ACCOUNT_KEY contains valid JSON
- Ensure the service account has proper permissions in Google Play Console

---

## Security Notes

### Public vs Private Secrets

**Public Configuration (Safe to Expose)**:
- **NEXT_PUBLIC_* secrets**: These are **intentionally public** and will be visible in browser JavaScript and compiled mobile apps. They are safe to use client-side.
  - Supabase URL and Anon Key are designed by Supabase to be public (protected by Row Level Security)
  - Stripe publishable key is designed to be public
  - App URL is public information
- **EXPO_PUBLIC_* secrets**: Similar to NEXT_PUBLIC_*, these are public and safe to expose in mobile apps
- These values are protected by backend security rules, RLS policies, and API validation

**Sensitive Secrets (Keep Private)**:
- **VERCEL_TOKEN**: Deployment token - never share or commit to code
- **SUPABASE_SERVICE_ROLE_KEY**: Bypasses RLS - highly sensitive
- **SUPABASE_DB_PASSWORD**: Database access - highly sensitive
- **STRIPE_SECRET_KEY**: Payment processing - highly sensitive
- **STRIPE_WEBHOOK_SECRET**: Webhook verification - highly sensitive
- **EXPO_TOKEN**: Expo account access token - keep private
- **GOOGLE_PLAY_SERVICE_ACCOUNT_KEY**: Contains credentials for Google Play API - highly sensitive

### Secret Rotation
If you need to rotate secrets (e.g., if a token is compromised):
1. Generate new token/key from the source (Vercel, Supabase, Stripe, Expo, Google Play Console)
2. In GitHub Secrets, click the secret name
3. Click "Update secret"
4. Paste new value and save
5. For specific secrets:
   - **VERCEL_TOKEN**: Generate new token at https://vercel.com/account/tokens
   - **SUPABASE_SERVICE_ROLE_KEY**: Rotate in Supabase Dashboard → Project Settings → API
   - **EXPO_TOKEN**: Generate new token at https://expo.dev/accounts/[account]/settings/access-tokens
   - **GOOGLE_PLAY_SERVICE_ACCOUNT_KEY**: Create new service account and revoke old one

---

## Complete Checklist

Use this checklist to verify setup:

### Web Deployment Setup
- [ ] Created Vercel account and project
- [ ] Collected Vercel token, org ID, and project ID
- [ ] Collected all Supabase config values from Dashboard
- [ ] Got Stripe publishable key and pricing table ID
- [ ] Added Vercel secrets (3) to GitHub Repository Secrets
- [ ] Added Supabase/Stripe public keys (4) to BOTH Repository Secrets AND Production Environment
- [ ] Added Supabase/Stripe private keys (5) to Production Environment only

### Mobile Build Setup (if deploying mobile app)
- [ ] Created Expo account at https://expo.dev
- [ ] Generated EXPO_TOKEN and added to GitHub secrets
- [ ] Set up Google OAuth client IDs for Web, iOS, and Android
- [ ] Set up Google Play Console and service account
- [ ] Downloaded and added GOOGLE_PLAY_SERVICE_ACCOUNT_KEY to GitHub secrets
- [ ] Verified all NEXT_PUBLIC_SUPABASE_* secrets are set (used by mobile builds)
- [ ] Verified all EXPO_PUBLIC_GOOGLE_* secrets are set

### Verification
- [ ] Verified all secret names are correct (case-sensitive)
- [ ] Triggered a new deployment
- [ ] Watched workflow complete successfully
- [ ] Verified production site has new changes

---

## Quick Reference Tables

### GitHub Actions Secrets (Required for CI/CD)

| Secret Name | Location | Used By | Source | Sensitive | Example Format |
|------------|----------|---------|--------|-----------|----------------|
| **VERCEL_TOKEN** | Repository | vercel-deploy.yml, preview-deploy.yml | Vercel Dashboard | ✅ Yes | `ABCxyz123...` |
| **VERCEL_ORG_ID** | Repository | vercel-deploy.yml, preview-deploy.yml | Vercel Project Settings | ⚠️ ID | `team_abc123` |
| **VERCEL_PROJECT_ID** | Repository | vercel-deploy.yml, preview-deploy.yml | Vercel Project Settings | ⚠️ ID | `prj_abc123xyz` |
| **NEXT_PUBLIC_SUPABASE_URL** | Both* | All workflows | Supabase Dashboard | ❌ No | `https://abc.supabase.co` |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | Both* | All workflows | Supabase Dashboard | ❌ No | `eyJhbGc...` |
| **SUPABASE_SERVICE_ROLE_KEY** | Environment | Backend API | Supabase Dashboard | ✅ Yes | `eyJhbGc...` |
| **SUPABASE_PROJECT_REF** | Environment | vercel-deploy.yml (migrations) | Supabase Dashboard URL | ⚠️ ID | `abcdefghijk` |
| **SUPABASE_DB_PASSWORD** | Environment | vercel-deploy.yml (migrations) | Supabase setup | ✅ Yes | `yourpassword` |
| **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** | Both* | vercel-deploy.yml, preview-deploy.yml | Stripe Dashboard | ❌ No | `pk_live_...` or `pk_test_...` |
| **NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID** | Both* | vercel-deploy.yml, preview-deploy.yml | Stripe Dashboard | ❌ No | `prctbl_...` |
| **STRIPE_SECRET_KEY** | Environment | Backend API | Stripe Dashboard | ✅ Yes | `sk_live_...` or `sk_test_...` |
| **STRIPE_WEBHOOK_SECRET** | Environment | Backend API | Stripe Dashboard | ✅ Yes | `whsec_...` |
| **NEXT_PUBLIC_APP_URL** | Environment | vercel-deploy.yml | Your Domain | ❌ No | `https://savr.cam` |
| **EXPO_TOKEN** | Repository | mobile-build.yml | Expo Dashboard | ✅ Yes | `abc123...` |
| **EXPO_PUBLIC_GOOGLE_CLIENT_ID** | Repository | mobile-build.yml | Google Cloud Console | ❌ No | `*.apps.googleusercontent.com` |
| **EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID** | Repository | mobile-build.yml | Google Cloud Console | ❌ No | `*.apps.googleusercontent.com` |
| **EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID** | Repository | mobile-build.yml | Google Cloud Console | ❌ No | `*.apps.googleusercontent.com` |
| **GOOGLE_PLAY_SERVICE_ACCOUNT_KEY** | Repository | mobile-build.yml (submit) | Google Play Console | ✅ Yes | `{"type":"service_account",...}` |

**Total: 18 GitHub Secrets Required**

*Both = Repository Secrets AND Production Environment (needed by different workflows)

### Secret Location Summary

**Repository Secrets (12 total):**
- VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID
- EXPO_TOKEN, EXPO_PUBLIC_GOOGLE_CLIENT_ID, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
- GOOGLE_PLAY_SERVICE_ACCOUNT_KEY

**Production Environment Secrets (10 total):**
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (duplicates)
- SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID (duplicates)
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_APP_URL

### Workflow-Specific Secret Mapping

**vercel-deploy.yml** (Web App Production Deployment):
- Uses Production Environment secrets (10): Supabase (5), Stripe (4), App URL (1)
- Uses Repository secrets (3): Vercel (3)

**preview-deploy.yml** (Web App Preview Deployment):
- Uses Repository secrets only (7): Vercel (3), Supabase (2), Stripe (2)

**mobile-build.yml** (Mobile App Build & Submit):
- Requires 8 secrets for builds: EXPO_TOKEN + Supabase (2) + Google OAuth (3)
- Additional 1 secret for submission: GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
- **Note**: Mobile workflow uses `EXPO_PUBLIC_*` prefix in environment variables for Supabase, sourcing from `NEXT_PUBLIC_*` GitHub secrets

**ci.yml** (Continuous Integration):
- No secrets required (only runs linting and type checking)

---

## Need Help?

- **Deployment docs**: See `DEPLOYMENT.md` in repository root
- **Vercel docs**: https://vercel.com/docs
- **Supabase docs**: https://supabase.com/docs
- **GitHub Actions docs**: https://docs.github.com/en/actions
- **Expo EAS docs**: https://docs.expo.dev/build/introduction/

---

## Appendix: Runtime Environment Variables

These environment variables are **NOT** GitHub secrets. They are configured in Vercel dashboard and local development environments.

### Vercel Environment Variables

Configure these in Vercel Dashboard → Project Settings → Environment Variables:

| Variable Name | Required | Sensitive | Description | Example |
|--------------|----------|-----------|-------------|---------|
| **OPENAI_API_KEY** | ✅ Yes | ✅ Yes | OpenAI API key for GPT-4 and Vision | `sk-...` |
| **SUPABASE_SERVICE_ROLE_KEY** | ✅ Yes | ✅ Yes | Supabase service role key (bypasses RLS) | `eyJhbGc...` |
| **STRIPE_SECRET_KEY** | ✅ Yes | ✅ Yes | Stripe secret key for payments | `sk_live_...` or `sk_test_...` |
| **STRIPE_WEBHOOK_SECRET** | ✅ Yes | ✅ Yes | Stripe webhook signing secret | `whsec_...` |
| **NEXT_PUBLIC_SUPABASE_URL** | ✅ Yes | ❌ No | Supabase project URL | `https://abc.supabase.co` |
| **NEXT_PUBLIC_SUPABASE_ANON_KEY** | ✅ Yes | ❌ No | Supabase anon/public key | `eyJhbGc...` |
| **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** | ✅ Yes | ❌ No | Stripe Publishable Key | `pk_live_...` or `pk_test_...` |
| **NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID** | ✅ Yes | ❌ No | Stripe Pricing Table ID for subscription UI | `prctbl_...` |
| **NEXT_PUBLIC_APP_URL** | ✅ Yes | ❌ No | Base URL for redirects | `https://savr.cam` |

**Note**: The NEXT_PUBLIC_* variables are also needed at build time (via GitHub secrets) and are automatically included in the deployed application.

### Mobile App Environment Variables

Configure these in `mobile/.env` (based on `mobile/.env.example`):

| Variable Name | Required | Sensitive | Description | Example |
|--------------|----------|-----------|-------------|---------|
| **EXPO_PUBLIC_SUPABASE_URL** | ✅ Yes | ❌ No | Supabase project URL (maps to NEXT_PUBLIC) | `https://abc.supabase.co` |
| **EXPO_PUBLIC_SUPABASE_ANON_KEY** | ✅ Yes | ❌ No | Supabase anon key (maps to NEXT_PUBLIC) | `eyJhbGc...` |
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

3. **Backend API** (Vercel serverless functions):
   ```bash
   # Configure environment variables in Vercel dashboard
   # Or use .env.local for local development
   ```

---

**Last Updated**: February 2026  
**Version**: 3.0.0  
**Coverage**: Vercel + Supabase deployment + Mobile build & submission
