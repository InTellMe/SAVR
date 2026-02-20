# SAVR Web App

Next.js 16 web application for SAVR.

## Tech

- Next.js App Router
- TypeScript
- Supabase Auth/Postgres/Storage
- Stripe subscriptions
- API routes in `app/api/*`

## Setup

```bash
npm install
cp ../.env.example .env.local
npm run dev
```

## Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## Type Check

```bash
npx tsc --noEmit
```

## Build

```bash
npm run build
```
