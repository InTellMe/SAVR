# Vercel Environment Variables Setup

This document describes the environment variables that must be configured in Vercel for production deployment of the SAVR application.

## Overview

The SAVR application requires both build-time and runtime environment variables to function correctly in production. These variables are configured in the Vercel dashboard under **Project Settings → Environment Variables**.

## Critical Runtime Secrets

These secrets are **ONLY** accessed at runtime (when API routes are called) and should **NOT** be available during the build process. They are configured in Vercel's environment variables.

### Stripe Configuration

| Variable | Type | Description | Where to Get It |
|----------|------|-------------|-----------------|
| `STRIPE_SECRET_KEY` | Secret | Stripe secret API key for server-side operations | [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Secret | Webhook signing secret for validating Stripe webhooks | [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) |

### Supabase Configuration

| Variable | Type | Description | Where to Get It |
|----------|------|-------------|-----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Service role key for admin operations | [Supabase Dashboard → Project Settings → API → service_role key](https://app.supabase.com/) |

### Other Runtime Secrets

| Variable | Type | Description | Where to Get It |
|----------|------|-------------|-----------------|
| `OPENAI_API_KEY` | Secret | OpenAI API key for AI features | [OpenAI Platform → API Keys](https://platform.openai.com/api-keys) |
| `GOOGLE_CLOUD_VISION_API_KEY` | Secret (Optional) | Google Cloud Vision API key (fallback) | [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/) |

## Build-Time Environment Variables

These variables are required during the Next.js build process and should be available as environment variables in Vercel.

### Supabase Public Configuration

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key (safe for client-side use) |

### Stripe Public Configuration

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Stripe publishable key (safe for client-side use) |
| `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` | Public | Stripe Pricing Table ID (e.g., `prctbl_xxx`) |

### Application Configuration

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public | Production domain URL (e.g., `https://savr.cam`) |

## How to Configure in Vercel

### Step 1: Access Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**

### Step 2: Add Variables

For each variable listed above:

1. Click **Add New**
2. Enter the **Key** (variable name)
3. Enter the **Value** (the actual secret or configuration value)
4. Select the **Environment(s)**: 
   - Production (required for live deployments)
   - Preview (optional, for PR preview deployments)
   - Development (optional, for local development)
5. Click **Save**

### Step 3: Important Notes

- **Runtime secrets** (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY) should only be added to **Production** environment
- **Public variables** (NEXT_PUBLIC_*) can be added to all environments
- After adding new variables, you need to **redeploy** your application for them to take effect
- Vercel encrypts all environment variables and they cannot be viewed after being saved

## Verification

After configuring all environment variables:

1. Trigger a new deployment (push to main branch or manually redeploy)
2. Check the deployment logs for any errors related to missing environment variables
3. Test the following functionality:
   - Stripe checkout and webhooks
   - AI features (recipe generation, image analysis)
   - User authentication and authorization

## Security Best Practices

1. **Never commit secrets to version control** - Use `.env.local` for local development
2. **Rotate secrets regularly** - Especially if they may have been compromised
3. **Use different secrets for different environments** - Don't use production keys in development
4. **Limit access** - Only team members who need access should have it
5. **Monitor usage** - Check Stripe, OpenAI, and Supabase dashboards for unusual activity

## Troubleshooting

### Build Failures

If you see errors like:
```
Error: Neither apiKey nor config.authenticator provided
Error: SUPABASE_SERVICE_ROLE_KEY is not configured
```

**Solution**: These errors indicate runtime secrets are missing. Add them to Vercel environment variables and redeploy.

### Runtime Errors

If the application builds but fails at runtime:

1. Check that all runtime environment variables are set in Vercel
2. Verify the variable names match exactly (including case)
3. Ensure you've redeployed after adding variables
4. Check the Vercel function logs for specific error messages

### Public Variables Not Working

If public variables (NEXT_PUBLIC_*) are undefined in the browser:

1. Ensure variable names start with `NEXT_PUBLIC_`
2. Verify they are set in Vercel for the Production environment
3. Redeploy the application after adding them
4. Clear browser cache and hard refresh

## Related Documentation

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [.env.example](/.env.example) - Template for local development
- [GITHUB_SECRETS_SETUP.md](/GITHUB_SECRETS_SETUP.md) - GitHub Actions secrets (legacy, for Firebase deployment)

## Summary Checklist

Before deploying to production, ensure all of these are configured in Vercel:

- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `GOOGLE_CLOUD_VISION_API_KEY` (optional)

---

**Last Updated**: February 2026  
**Version**: 1.0.0
