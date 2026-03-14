# Supabase Setup Guide

This guide explains how to set up Supabase for the SAVR application after migrating from Firebase.

## Prerequisites

- [Supabase account](https://app.supabase.com/)
- Access to Stripe Dashboard
- Access to OpenAI API

## 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Fill in project details:
   - Name: `savr` (or your preferred name)
   - Database Password: Generate a strong password (save it securely)
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)

## 2. Get API Keys

From your Supabase project dashboard:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

## 3. Run Database Migrations

The schema for the entire application is defined in a single migration file at
`/supabase/migrations/20260220000000_initial_schema.sql`.

### Option A: Using Supabase Dashboard

1. Go to **SQL Editor** in your Supabase dashboard
2. Open and run the migration file:
   - `20260220000000_initial_schema.sql`

### Option B: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (get project ref from dashboard URL)
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## 4. Configure Storage Buckets

Storage buckets are created automatically by the migration script. No manual setup is needed.

The migration creates the following buckets with appropriate RLS policies:

- `recipe-images` (Public read, users write to their own folder)
- `inventory-images` (Private, users access their own folder only)

## 5. Configure Authentication

### Email/Password Auth

Email/password authentication is enabled by default. Configure email templates:

1. Go to **Authentication** → **Email Templates**
2. Customize templates (optional):
   - Confirm signup
   - Reset password
   - Magic Link

### Google OAuth

1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Configure OAuth consent screen in Google Cloud Console
4. Add authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback` (for local dev)
5. Enter Client ID and Client Secret from Google Cloud Console

### Mobile OAuth Configuration

For mobile (Expo), you need additional configuration:

1. Create separate OAuth clients for iOS and Android in Google Cloud Console
2. Configure deep linking in `mobile/app.config.ts`
3. Add the mobile client IDs to your environment variables

## 6. Configure Environment Variables

### Web Application (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID=prctbl_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Mobile Application (mobile/.env)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Vercel

Configure the following environment variables in Vercel:

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add all variables from `.env.local`
3. Set `SUPABASE_SERVICE_ROLE_KEY` as **Secret**
4. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as **Secret**

## 7. Configure Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter webhook URL:
   - Production: `https://savr.cam/api/stripe/webhook`
   - Development: Use Stripe CLI to forward webhooks
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.paused`
   - `customer.subscription.resumed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** → This is your `STRIPE_WEBHOOK_SECRET`

### Test Webhook Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

## 8. Row Level Security (RLS) Verification

Verify RLS policies are working:

```sql
-- Test as authenticated user
set local role authenticated;
set local request.jwt.claims.sub to 'user-uuid-here';

-- Try to query data
select * from users where id = 'user-uuid-here'; -- Should work
select * from users where id = 'different-user-uuid'; -- Should return nothing
```

## 9. Enable Realtime (Optional)

If your app uses realtime subscriptions:

1. Go to **Database** → **Replication**
2. Enable replication for tables that need realtime:
   - `users` (for subscription updates)
   - `inventory`
   - `recipes`
   - `meal_plans`
   - `chat_history`

## 10. Monitoring and Logs

### Database Logs
- Go to **Logs** → **Postgres Logs** to see database queries and errors

### Auth Logs
- Go to **Authentication** → **Logs** to see auth events

### Edge Function Logs (if using)
- Go to **Edge Functions** → Select function → **Logs**

## 11. Backup Strategy

Supabase automatically backs up your database. Configure additional backups:

1. Go to **Database** → **Backups**
2. Configure Point-in-Time Recovery (PITR) for production
3. Download manual backups periodically

## Troubleshooting

### Authentication Issues

- Check that email templates are configured
- Verify OAuth redirect URIs match exactly
- Check browser console for CORS errors

### Database Connection Issues

- Verify connection string in environment variables
- Check if IP is allowed in Supabase dashboard (if using direct connection)
- Ensure RLS policies allow the operation

### Storage Issues

- Verify bucket policies are set correctly
- Check file size limits (default 50MB)
- Ensure proper MIME types are being used

## Security Checklist

- [ ] RLS is enabled on all tables
- [ ] RLS policies are tested
- [ ] Service role key is never exposed to client
- [ ] Storage buckets have proper access policies
- [ ] Stripe webhook signature is verified
- [ ] API rate limiting is configured (if needed)
- [ ] Environment variables are set correctly

## Next Steps

After setup is complete:

1. Test authentication flows
2. Test CRUD operations
3. Test Stripe checkout and webhooks
4. Test file uploads
5. Deploy to Vercel
6. Monitor logs for errors

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)
- [GitHub Issues](https://github.com/GooseyPrime/SAVR/issues)
