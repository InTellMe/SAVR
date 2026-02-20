# Deployment Guide for SAVR

This guide covers deploying the SAVR application to production using Vercel + Supabase + EAS architecture.

## Architecture Overview

- **Web Frontend**: Next.js hosted on Vercel
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Storage**: Supabase Storage
- **Payments**: Stripe
- **Mobile App**: React Native (Expo) built with EAS Build

## Prerequisites

- Vercel account: https://vercel.com
- Supabase account: https://supabase.com
- Stripe account: https://stripe.com
- Expo account: https://expo.dev (for mobile)
- Domain configured: savr.cam
- API keys obtained:
  - OpenAI API key
  - Stripe API keys
  - Google OAuth credentials (for mobile)

## Part 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Choose organization and enter:
   - **Name**: SAVR Production
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to your users (e.g., us-east-1)
4. Click "Create new project" (takes ~2 minutes)

### 1.2 Configure Authentication

1. Go to Authentication → Providers
2. Enable **Email** provider
3. Enable **Google** provider:
   - Add Google OAuth Client ID
   - Add Google OAuth Client Secret
   - Get these from [Google Cloud Console](https://console.cloud.google.com)
4. Go to Authentication → URL Configuration:
   - Add **Site URL**: `https://savr.cam`
   - Add **Redirect URLs**:
     - `https://savr.cam/auth/callback`
     - `https://savr.cam/*`
     - `http://localhost:3000/*` (for development)

### 1.3 Run Database Migrations

```bash
# Navigate to project root
cd /path/to/SAVR

# Install Supabase CLI
npm install -g supabase

# Link to your project (get project ref from dashboard)
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 1.4 Set Up Storage Buckets

1. Go to Storage
2. Create bucket: **receipts**
   - Public: No
   - File size limit: 10 MB
   - Allowed MIME types: image/*, application/pdf
3. Configure RLS policies (should be in migration files)

### 1.5 Get Supabase Credentials

Go to Project Settings → API:

- **Project URL**: Copy this (e.g., `https://abc123.supabase.co`)
- **Anon/Public Key**: Copy this (safe to expose, starts with `eyJ...`)
- **Service Role Key**: Copy this (⚠️ KEEP SECRET, bypasses RLS)
- **Project Ref**: From URL (e.g., `abc123`)
- **Database Password**: From step 1.1

## Part 2: Vercel Setup

### 2.1 Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import the SAVR repository from GitHub
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 2.2 Configure Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (⚠️ Secret!)

**Stripe:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `STRIPE_SECRET_KEY`: Your Stripe secret key (⚠️ Secret!)
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret (⚠️ Secret!)
- `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`: Your Stripe pricing table ID

**Other:**
- `NEXT_PUBLIC_APP_URL`: `https://savr.cam`
- `OPENAI_API_KEY`: Your OpenAI API key (⚠️ Secret!)

Set all variables for **Production**, **Preview**, and **Development** environments.

### 2.3 Link Vercel Project

```bash
# Navigate to web directory
cd web

# Install Vercel CLI
npm install -g vercel@latest

# Link project
vercel link

# This creates .vercel/project.json with org and project IDs
```

### 2.4 Configure Custom Domain

1. In Vercel Dashboard → Project → Settings → Domains
2. Add domain: `savr.cam`
3. Add domain: `www.savr.cam` (set as redirect to savr.cam)
4. Configure DNS records as shown by Vercel

## Part 3: Stripe Setup

### 3.1 Create Stripe Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Create products:
   - **Basic Plan**: $5.99/month or $69.99/year (save 2 months)
   - **Pro Plan**: $9.99/month or $99.99/year (save 2 months)
3. Enable 5-day free trial on all plans

### 3.2 Create Pricing Table

1. Go to Products → Pricing Tables
2. Click "Create pricing table"
3. Add all your products
4. Configure:
   - Trial: 5 days
   - Payment method collection: During trial
5. Save and copy the Pricing Table ID (starts with `prctbl_...`)

### 3.3 Configure Webhooks

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. **Endpoint URL**: `https://savr.cam/api/stripe/webhook`
4. **Events to send**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `checkout.session.completed`
5. Save and copy the **Signing secret** (starts with `whsec_...`)

## Part 4: GitHub Actions Setup

### 4.1 Configure GitHub Secrets

Go to Repository → Settings → Environments → Production:

**Vercel:**
- `VERCEL_TOKEN`: Generate at https://vercel.com/account/tokens
- `VERCEL_ORG_ID`: From `.vercel/project.json`
- `VERCEL_PROJECT_ID`: From `.vercel/project.json`

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

**Stripe:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

**Other:**
- `NEXT_PUBLIC_APP_URL`: `https://savr.cam`

For detailed instructions, see [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)

### 4.2 Workflows

The following workflows are configured in `.github/workflows/`:

- **vercel-deploy.yml**: Deploys to production on push to main
- **preview-deploy.yml**: Creates preview deployments for PRs
- **ci.yml**: Runs linting and type checking
- **mobile-build.yml**: Builds mobile app with EAS Build

## Part 5: Mobile App Deployment (Optional)

### 5.1 Configure EAS Build

1. Go to [Expo Dashboard](https://expo.dev)
2. Create account/login
3. Create new project or link existing

### 5.2 Configure Mobile Environment

In `mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...apps.googleusercontent.com
```

### 5.3 Build Mobile App

```bash
cd mobile

# Build for Android
eas build --platform android --profile production

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile production
```

### 5.4 Submit to Stores

```bash
# Submit to Google Play
eas submit --platform android --latest

# Submit to App Store
eas submit --platform ios --latest
```

## Part 6: Verification

### 6.1 Test Web Application

1. Visit https://savr.cam
2. Test user registration and login
3. Test receipt upload and analysis
4. Test subscription flow
5. Verify webhooks are working (check Stripe Dashboard)

### 6.2 Test Mobile Application

1. Download app from TestFlight/Internal Track
2. Test login with Google and email
3. Test receipt scanning
4. Test data sync with web app

### 6.3 Monitor Deployment

**Vercel:**
- Check deployment logs in Vercel Dashboard
- Monitor function executions
- Check analytics

**Supabase:**
- Monitor database usage in Supabase Dashboard
- Check auth logs
- Monitor API requests

**Stripe:**
- Verify webhooks are being received
- Monitor successful payments
- Check for failed payments

## Part 7: Production Checklist

- [ ] Supabase project created and configured
- [ ] Database migrations applied
- [ ] Storage buckets configured
- [ ] Authentication providers enabled
- [ ] Vercel project created and deployed
- [ ] Environment variables configured
- [ ] Custom domain configured and DNS updated
- [ ] Stripe products and pricing table created
- [ ] Stripe webhooks configured and tested
- [ ] GitHub Actions secrets configured
- [ ] Deployment workflows tested
- [ ] Web application tested end-to-end
- [ ] Mobile application built (if applicable)
- [ ] Monitoring and alerts configured

## Troubleshooting

### Deployment Fails

**Check Vercel logs:**
```bash
vercel logs
```

**Common issues:**
- Missing environment variables
- Build errors in Next.js
- Database connection issues

### Webhooks Not Working

1. Check webhook endpoint URL is correct
2. Verify webhook secret matches
3. Check Vercel function logs
4. Test webhook with Stripe CLI:
   ```bash
   stripe listen --forward-to https://savr.cam/api/stripe/webhook
   ```

### Database Connection Issues

1. Verify Supabase credentials
2. Check RLS policies are correctly configured
3. Verify database is not paused (free tier)

### Mobile Build Fails

1. Check EAS build logs
2. Verify all environment variables are set
3. Check Google OAuth credentials
4. Verify app.json configuration

## Rollback Procedure

### Rollback Web Deployment

In Vercel Dashboard:
1. Go to Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

Or via CLI:
```bash
vercel rollback
```

### Rollback Database Migration

```bash
# Revert last migration
supabase db reset

# Or restore from backup in Supabase Dashboard
```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Expo Documentation](https://docs.expo.dev)
- [GitHub Actions Setup Guide](GITHUB_SECRETS_SETUP.md)

## Support

For issues:
1. Check Vercel deployment logs
2. Check Supabase dashboard logs
3. Check GitHub Actions workflow runs
4. Review this deployment guide
5. Check deployment logs in Vercel, Supabase, and GitHub Actions

---

**Last Updated**: February 2026  
**Version**: 3.0.0  
**Architecture**: Vercel + Supabase + EAS
