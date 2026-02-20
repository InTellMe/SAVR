# SAVR by GooseyPrime

SAVR is an AI-powered food management platform that helps you manage your pantry inventory, generate recipes, plan meals, and create grocery lists. Built as a modern web and mobile application with Supabase backend and Vercel hosting, focusing on intelligent photo-based inventory management.

> **📋 GitHub Actions Setup**: Automated deployment requires GitHub Secrets configuration. See [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) for required secrets and setup instructions.

## 🌟 Features

### Core Features

- **AI Image Recognition**: Upload photos of your pantry/fridge and let OpenAI Vision (with Google Vision fallback) automatically extract ingredients
- **Smart Inventory Management**: Track what you have, when it expires, and where it's stored
- **AI Recipe Generation**: Get personalized recipes based on your available ingredients using GPT-4
- **Meal Planning**: Create weekly meal plans tailored to your dietary preferences
- **Grocery Lists**: Automatically generate shopping lists from meal plans
- **Cooking Assistant**: Chat with an AI assistant for cooking tips and recipe help (Pro tier)

### Subscription Tiers

- **Basic Tier**: 50 inventory items, 10 recipes/month, 2 meal plans/month
  - Monthly: $5.99/month
  - Yearly: $69.99/year (save ~$2)
- **Pro Tier**: Unlimited items, recipes, meal plans, AI chat
  - Monthly: $9.99/month
  - Yearly: $99.99/year (save ~$20)

### Payment Options

- Stripe checkout (credit/debit cards)
- Coupon code support (100% discount coupons skip payment collection)
- Server-side subscription validation and gating

## 🏗️ Architecture

### Web Application (`/web`)

- **Framework**: Next.js 16 with TypeScript, React 19
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (Auth, Postgres, Storage, Realtime)
- **API Routes**: Vercel serverless functions
- **Hosting**: Vercel at savr.cam
- **Key Feature**: Photo upload for pantry/fridge inventory management

### Mobile Application (`/mobile`)

- **Framework**: Expo 54 + React Native 0.81 with TypeScript
- **Navigation**: React Navigation 7.x (bottom tabs + stack)
- **Backend**: Shared Supabase infrastructure with web app
- **Platforms**: Android (Google Play Store) and iOS (App Store)
- **Key Feature**: Camera-based AI pantry scanning, full feature parity with web
- **Build System**: EAS Build for production releases

### API Routes (`/web/app/api`)

- **Runtime**: Node.js 20 with TypeScript (Vercel serverless)
- **AI Services** (`/api/ai/*`):
  - `analyze-image`: OpenAI Vision + Google Vision API for ingredient extraction
  - `create-recipe`: GPT-4 powered recipe generation
  - `create-meal-plan`: Multi-day meal planning
  - `create-grocery-list`: Smart grocery list generation
  - `chat`: AI cooking assistant
  - `scan-receipt`: Receipt scanning and extraction
- **Inventory** (`/api/inventory/*`):
  - `deduct`: Automatic inventory deduction
- **Stripe** (`/api/stripe/*`):
  - `webhook`: Subscription event handling
  - `portal`: Customer portal access
- **Transfer** (`/api/transfer/*`):
  - `create-session`: Photo transfer sessions
- **ML Labeling** (`/api/labeling/*`):
  - `upload`, `annotations`, `save-annotation`, `segment`, `export`: Dataset management

### Database (Supabase Postgres)

- **Tables**: users, inventory, recipes, meal_plans, grocery_lists, chat_history, shared_recipes, transfer_sessions, data_consent, images, annotations, categories
- **Security**: Row Level Security (RLS) policies for all tables
- **Realtime**: PostgreSQL change data capture for live updates
- **Migrations**: Versioned SQL migrations in `supabase/migrations/`

### Shared TypeScript Types

⚠️ **IMPORTANT**: TypeScript interfaces are shared across web frontend and API routes.

**When modifying shared types, you MUST:**
1. Verify changes work in both `/web/app` and `/web/app/api`
2. Run `npm run build` in `/web` before committing
3. Update imports in any files that reference the modified types
4. Test all affected endpoints and components

**Common shared types include:**
- Database models: `InventoryItem`, `Recipe`, `MealPlan`, `GroceryList`, etc.
- AI types: `AiRecipe`, `AiIngredient`, `NutritionalInfo`, etc.
- Request/Response contracts for API routes
- Supabase database row types

Any breaking changes to these interfaces will break the build pipeline and must be coordinated across the application.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase CLI (`npm install -g supabase`)
- Supabase project with:
  - Authentication enabled (Email, Google)
  - PostgreSQL database
  - Storage buckets
  - Realtime enabled
- Vercel account (for deployment)

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/GooseyPrime/SAVR.git
cd SAVR
```

2. **Quick Setup (Recommended)**

Use the automated setup script to install all dependencies:

**Linux/Mac:**
```bash
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

This will automatically install dependencies for web and mobile applications.

**Manual Setup (Alternative):**

2a. **Configure environment variables**

```bash
# Copy the example file
cp .env.example .env.local

# Add your Supabase and API keys
# - Supabase URL and keys from Supabase Dashboard
# - OpenAI API key from OpenAI
# - Stripe keys from Stripe Dashboard
# - Google Cloud Vision API key (optional, for fallback)
```

2b. **Install dependencies**

```bash
# Web app
cd web
npm install

# Mobile app (optional)
cd ../mobile
npm install
```

3. **Set up Supabase**

```bash
# Start Supabase locally
supabase start

# Apply database migrations
supabase db reset --local

# Get local credentials
supabase status
```

Update your `.env.local` with the local Supabase credentials for development.

4. **Run the web app locally** (Primary Platform)

```bash
cd web
npm run dev
```

Visit `http://localhost:3000` to access the web application where you can upload photos of your pantry and fridge!

5. **Run the mobile app locally**

```bash
cd mobile
npm install
npm start
# Then press 'a' for Android or 'i' for iOS
```

## 📁 Project Structure

```
SAVR/
```
├── .github/                   # GitHub Actions workflows
│   └── workflows/            # CI/CD pipelines
├── web/                      # Next.js web application
│   ├── app/                  # Next.js 13+ app directory
│   │   └── api/             # Vercel API routes (serverless functions)
│   ├── components/           # React components
│   ├── contexts/             # React contexts (Auth)
│   ├── lib/                  # Utilities, Supabase config, database helpers
│   └── public/               # Static assets
├── mobile/                   # React Native mobile app
│   ├── src/
│   │   ├── screens/          # App screens
│   │   ├── components/       # Reusable components
│   │   ├── navigation/       # Navigation setup
│   │   ├── contexts/         # Auth and app contexts
│   │   ├── config/           # Supabase configuration
│   │   └── utils/            # API client, utilities
│   └── App.tsx               # App entry point
├── supabase/                 # Supabase configuration
│   ├── migrations/           # Database schema migrations
│   └── config.toml           # Local development config
├── e2e-tests/                # End-to-end tests (Playwright)
└── .env.example              # Environment variables template
```

## 🔐 Security

- Supabase Authentication for user management
- Row Level Security (RLS) policies on all database tables
- Storage bucket policies prevent unauthorized file access
- Server-side subscription tier validation in API routes
- HTTPS-only API endpoints (Vercel)
- No API keys or secrets in client code
- Automated security scanning via GitHub Actions (CodeQL, Trivy, secret scanning)

## 🔑 Environment Variables & Secrets

SAVR requires various environment variables and secrets for operation and deployment. See detailed setup guides:

### For CI/CD Deployment (GitHub Actions)
- **[GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)** - Complete guide for configuring GitHub Actions secrets
- Required: Supabase, Vercel, Stripe, and OpenAI secrets
- **Authentication**: 
  - `VERCEL_TOKEN` - Vercel deployment token
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin access
- **Required secrets for web deployment**:
  - `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` - Vercel project identifiers
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase connection
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe client-side key
  - `OPENAI_API_KEY` - OpenAI API access (server-side only)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe server-side keys

### For Local Development

**Web Application** (`.env.local`):
```bash
# Copy from example and fill in your values
cp .env.example .env.local
```

Required variables (from `.env.example`):
- **Supabase**: URL and anon key
- **OpenAI**: API key for GPT-4 and Vision
- **Google Cloud Vision**: API key (optional fallback)
- **Stripe**: Publishable key, secret key, webhook secret, and price IDs
- **App**: Base URL

**Mobile Application** (`mobile/.env`):
```bash
# Copy from example and fill in your values
cp mobile/.env.example mobile/.env
```

Required variables (from `mobile/.env.example`):
- **Supabase**: URL and anon key (using `EXPO_PUBLIC_*` prefix)
- **Google OAuth**: 3 client IDs (Web, iOS, Android)

### Environment Variable Categories

| Category | Count | Examples | Sensitive |
|----------|-------|----------|-----------|
| Supabase Config | 2 | URL, ANON_KEY | ❌ Public |
| Supabase Deploy | 2 | SERVICE_ROLE_KEY, PROJECT_REF | ✅ Private |
| OpenAI | 1 | OPENAI_API_KEY | ✅ Private |
| Google Cloud | 1 | GOOGLE_CLOUD_VISION_API_KEY | ✅ Private |
| Stripe Config | 3 | Publishable/Secret keys, Webhook secret | ⚠️ Mixed |
| Stripe Prices | 4 | Price IDs for 4 subscription tiers | ❌ Public |
| Mobile Build | 2 | EXPO_TOKEN, GOOGLE_PLAY_SERVICE_ACCOUNT_KEY | ✅ Private |
| Google OAuth | 3 | Client IDs for Web/iOS/Android | ❌ Public |
| Vercel | 3 | TOKEN, ORG_ID, PROJECT_ID | ✅ Private |
| App Config | 1 | NEXT_PUBLIC_APP_URL | ❌ Public |

**Security Notes**:
- ✅ Private = Keep secret, never commit to code
- ❌ Public = Safe to expose in client-side code
- ⚠️ Mixed = Publishable key is public, secret key is private

For detailed setup instructions, see [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md).

---

### Build the project

```bash
# Web app
cd web
npm run build
```

### Test locally

Start Supabase local development:
```bash
supabase start
```

This starts local PostgreSQL, Storage, and other Supabase services.

## 🌐 Deployment

### Prerequisites

Before deploying, ensure all required secrets are configured:
- **For automated CI/CD**: See [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) for GitHub Actions secrets setup
- **For manual deployment**: Ensure Vercel CLI is installed and authenticated

### Web Application (Vercel)

**Automatic Deployment:**
- Push to `main` branch triggers automatic deployment via GitHub Actions
- Pull requests get preview deployments automatically
- See [DEPLOYMENT.md](DEPLOYMENT.md) for details

**Manual Deployment:**
```bash
cd web
npm run build
vercel --prod
```

**First-time Vercel Setup:**
```bash
# Install Vercel CLI
npm install -g vercel

# Link to your Vercel project
cd web
vercel link

# Configure environment variables in Vercel Dashboard
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# - NEXT_PUBLIC_APP_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
```

### Database Migrations (Supabase)

```bash
# Apply migrations to production
supabase db push --project-ref your-project-ref

# Or use GitHub Actions workflow
# Migrations run automatically on deployment to main
```

### Custom Domain

Configure `savr.cam` in Vercel project settings.

### Mobile App - Google Play Store Deployment

The mobile app uses [EAS Build](https://docs.expo.dev/build/introduction/) for building and submitting to the Google Play Store.

#### Prerequisites

- [Expo account](https://expo.dev/signup) and EAS CLI installed: `npm install -g eas-cli`
- [Google Play Developer account](https://play.google.com/console/) ($25 one-time fee)
- Google Play service account JSON key for automated submissions
- Firebase project configured with Android app (SHA-1 certificate fingerprint)
- **GitHub Secrets configured**: See [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) for mobile-specific secrets (EXPO_TOKEN, GOOGLE_PLAY_SERVICE_ACCOUNT_KEY)

#### One-time Setup

1. **Log in to EAS and link the project:**

```bash
cd mobile
eas login
eas init
```

2. **Configure Firebase for Android:**

   - Go to [Firebase Console](https://console.firebase.google.com/) > Project Settings > Add App > Android
   - Use package name: `com.savr.app`
   - Download `google-services.json` and place it in `mobile/`
   - Add your debug/release SHA-1 fingerprint (required for Google Sign-In)

3. **Set up Google Play service account for automated submission:**

   - In Google Play Console, go to Setup > API access
   - Create a service account with "Release manager" permissions
   - Download the JSON key and save it as `mobile/google-play-service-account.json`

4. **Configure environment secrets on Expo:**

```bash
eas secret:create --name FIREBASE_API_KEY --value "your-api-key" --scope project
eas secret:create --name FIREBASE_AUTH_DOMAIN --value "your-auth-domain" --scope project
eas secret:create --name FIREBASE_PROJECT_ID --value "your-project-id" --scope project
eas secret:create --name FIREBASE_STORAGE_BUCKET --value "your-storage-bucket" --scope project
eas secret:create --name FIREBASE_MESSAGING_SENDER_ID --value "your-sender-id" --scope project
eas secret:create --name FIREBASE_APP_ID --value "your-app-id" --scope project
```

#### Building for Play Store

```bash
cd mobile

# Development build (APK for testing)
eas build --platform android --profile development

# Preview build (APK for internal testing)
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

#### Submitting to Google Play Store

```bash
# Submit the latest production build to Google Play (internal track)
eas submit --platform android --latest

# Or submit a specific build
eas submit --platform android --id BUILD_ID
```

#### Play Store Release Process

1. **Internal Testing**: Build with `production` profile, submit via `eas submit`. Test on internal track.
2. **Closed Testing**: Promote from internal to closed testing in Google Play Console.
3. **Open Testing / Production**: After testing, promote to open testing or production in Google Play Console.

#### CI/CD Automated Builds

The GitHub Actions workflow (`.github/workflows/mobile-build.yml`) automatically:
- Builds an Android preview APK on every push to `main` that changes `mobile/` files
- Supports manual dispatch for production builds and Play Store submission
- Runs TypeScript checks before building

**Required GitHub secrets**: 
- `EXPO_TOKEN` - Expo authentication token
- `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` - Google Play API credentials (for submission)
- All 6 `NEXT_PUBLIC_FIREBASE_*` secrets (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID)

See [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) for detailed setup instructions.

## 📊 Tech Stack

- **Frontend**: React 19, Next.js 16, TypeScript, Tailwind CSS 4
- **Mobile**: React Native 0.81, Expo 54, TypeScript
- **Backend**: Firebase (Auth, Firestore, Functions, Storage, Hosting)
- **AI**: OpenAI GPT-4o, OpenAI Vision, Google Cloud Vision
- **Payments**: Stripe
- **Web Deployment**: Firebase Hosting, Cloud Functions, GitHub Actions CI/CD
- **Mobile Deployment**: EAS Build, Google Play Store, GitHub Actions CI/CD

## 🤝 Contributing

This is a proprietary SaaS application by GooseyPrime. Internal team contributions only.

## 📄 License

Proprietary - © 2026 GooseyPrime. All rights reserved.

## 🔗 Links

- **Production**: https://savr.cam
- **Repository**: https://github.com/GooseyPrime/SAVR
- **Documentation**: See `/web/docs` and `/mobile/docs`

## 💬 Support

For issues or questions, contact the GooseyPrime development team.

---

Built with ❤️ by GooseyPrime
