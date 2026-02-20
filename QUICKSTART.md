# SAVR Quick Start

## Prerequisites

- Node.js 20+
- npm
- Supabase CLI
- Expo Go (optional, for mobile device testing)

## 1. Install Dependencies

```bash
cd web
npm install

cd ../mobile
npm install --legacy-peer-deps
```

## 2. Configure Environment Variables

```bash
# from repository root
cp .env.example .env.local
cp mobile/.env.example mobile/.env
```

Set values for:

- Supabase (`NEXT_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_SUPABASE_*`)
- Stripe (`NEXT_PUBLIC_STRIPE_*`, `STRIPE_*`)
- OpenAI (`OPENAI_API_KEY`)
- Mobile Google OAuth (`EXPO_PUBLIC_GOOGLE_*`)

## 3. Start Supabase Locally

```bash
supabase start
supabase db reset --local
```

## 4. Run Web App

```bash
cd web
npm run dev
```

Web app: `http://localhost:3000`

## 5. Run Mobile App

```bash
cd mobile
npm start
```

Use Expo QR scan or emulator.

## 6. Validate TypeScript

```bash
cd web && npx tsc --noEmit
cd mobile && npx tsc --noEmit
```

## More Setup Guides

- `SUPABASE_SETUP.md`
- `DEPLOYMENT.md`
- `GITHUB_SECRETS_SETUP.md`
