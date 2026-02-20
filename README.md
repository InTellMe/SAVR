# SAVR

SAVR is an AI-powered pantry, recipe, and meal-planning platform with a Supabase backend, Vercel-hosted web app, and Expo mobile app.

## Stack

- Web: Next.js 16 + TypeScript (`web/`)
- Mobile: Expo + React Native + TypeScript (`mobile/`)
- Backend: Supabase (Auth, Postgres, Storage, Realtime)
- Payments: Stripe
- AI: OpenAI (with Google Vision fallback in web API routes)

## Repository Layout

- `web/`: Next.js application and API routes
- `mobile/`: Expo mobile app
- `supabase/migrations/`: database schema migrations
- `.github/workflows/`: CI/CD, security, tests, and deployments
- `archive/`: historical and obsolete guidance/artifacts

## Quick Start

1. Install dependencies:

```bash
cd web && npm install
cd ../mobile && npm install --legacy-peer-deps
```

2. Configure environment files:

- `./.env.local` from `./.env.example`
- `./mobile/.env` from `./mobile/.env.example`

3. Start local services:

```bash
supabase start
```

4. Run apps:

```bash
cd web && npm run dev
cd mobile && npm start
```

## TypeScript Validation

```bash
cd web && npx tsc --noEmit
cd mobile && npx tsc --noEmit
```

## Deployment

- Web and API: Vercel
- Database migrations: Supabase CLI / GitHub Actions
- Mobile builds: EAS Build

See:

- `DEPLOYMENT.md`
- `SUPABASE_SETUP.md`
- `GITHUB_SECRETS_SETUP.md`
- `TESTING_PLAN.md`

## Notes on Archived Docs

Legacy Firebase-era docs, incident notes, and historical planning docs were moved to `archive/` to keep active guidance focused on the current platform.
