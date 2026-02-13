# SAVR by InTellMe

> **⚠️ DEPLOYMENT NOTICE**: GitHub Actions automatic deployment is currently not configured. See [ACTION_REQUIRED.md](ACTION_REQUIRED.md) for immediate action needed to enable automated deployments.

SAVR is an AI-powered food management platform that helps you manage your pantry inventory, generate recipes, plan meals, and create grocery lists. Built as a Firebase-hosted React/Next.js web application focusing on a web-based MVP where users upload photos of their pantry and fridge to manage inventory.

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

- **Framework**: Next.js 16 with TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Storage)
- **Hosting**: Firebase Hosting at www.SAVR.cam
- **Key Feature**: Photo upload for pantry/fridge inventory management

### Mobile Application (`/mobile`)

- **Framework**: Expo 54 + React Native 0.81 with TypeScript
- **Navigation**: React Navigation 7.x (bottom tabs + stack)
- **Backend**: Shared Firebase infrastructure with web app
- **Platforms**: Android (Google Play Store) and iOS (App Store)
- **Key Feature**: Camera-based AI pantry scanning, full feature parity with web
- **Build System**: EAS Build for production releases

### Cloud Functions (`/functions`)

- **Runtime**: Node.js 20 with TypeScript
- **Services**:
  - `analyzeImage`: OpenAI Vision + Google Vision API for ingredient extraction
  - `createRecipe`: GPT-4 powered recipe generation
  - `createMealPlan`: Multi-day meal planning
  - `createGroceryList`: Smart grocery list generation
  - `chat`: AI cooking assistant
  - `createStripeCheckout`: Stripe subscription management
  - `stripeWebhook`: Subscription event handling
  - `onUserCreate`: Automatic user initialization

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with:
  - Authentication enabled (Email, Google)
  - Firestore database
  - Cloud Functions
  - Storage
  - Hosting

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/InTellMe/SAVR.git
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

This will automatically install dependencies for both web and functions, and build the functions.

**Manual Setup (Alternative):**

2a. **Configure environment variables**

```bash
# Copy the example file
cp .env.example .env.local

# Add your Firebase and API keys
# - Firebase configuration from Firebase Console
# - OpenAI API key from OpenAI
# - Stripe keys from Stripe Dashboard
```

2b. **Install dependencies**

```bash
# Web app
cd web
npm install

# Cloud Functions
cd ../functions
npm install

# Mobile app (optional)
cd ../mobile
npm install
```

3. **Deploy Firebase infrastructure**

```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Storage rules
firebase deploy --only storage

# Build and deploy Cloud Functions
cd functions
npm run build
cd ..
firebase deploy --only functions
```

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
├── web/                      # Next.js web application
│   ├── app/                  # Next.js 13+ app directory
│   ├── components/           # React components
│   ├── contexts/             # React contexts (Auth)
│   ├── lib/                  # Utilities and Firebase config
│   └── public/               # Static assets
├── mobile/                   # React Native mobile app
│   ├── src/
│   │   ├── screens/          # App screens
│   │   ├── components/       # Reusable components
│   │   ├── navigation/       # Navigation setup
│   │   └── contexts/         # Auth and app contexts
│   └── App.tsx               # App entry point
├── functions/                # Firebase Cloud Functions
│   ├── src/
│   │   ├── services/         # AI and payment services
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Helper utilities
│   └── package.json
├── firebase.json             # Firebase configuration
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Firestore indexes
├── storage.rules             # Storage security rules
└── .env.example              # Environment variables template
```

## 🔐 Security

- Firebase Authentication for user management
- Firestore security rules enforce data access control
- Storage rules prevent unauthorized file access
- Server-side subscription tier validation
- HTTPS-only Cloud Functions
- No API keys or secrets in client code

## 🔑 Environment Variables & Secrets

SAVR requires various environment variables and secrets for operation and deployment. See detailed setup guides:

### For CI/CD Deployment (GitHub Actions)
- **[GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)** - Complete guide for configuring GitHub Actions secrets
- Required: 12 GitHub secrets for automated deployments (10 for web, 2 additional for mobile)
- Includes: Firebase tokens, API keys, Expo tokens, and Google Play credentials

### For Local Development

**Web Application** (`.env.local`):
```bash
# Copy from example and fill in your values
cp .env.example .env.local
```

Required variables (from `.env.example`):
- **Firebase**: 6 config values (API key, auth domain, project ID, storage bucket, sender ID, app ID)
- **OpenAI**: API key for GPT-4 and Vision
- **Google Cloud Vision**: API key (optional fallback)
- **Stripe**: Publishable key, secret key, webhook secret, and 4 price IDs
- **App**: Base URL

**Mobile Application** (`mobile/.env`):
```bash
# Copy from example and fill in your values
cp mobile/.env.example mobile/.env
```

Required variables (from `mobile/.env.example`):
- **Firebase**: Same 6 config values as web (using `EXPO_PUBLIC_*` prefix)
- **Google OAuth**: 3 client IDs (Web, iOS, Android)

**Firebase Functions**:
Configure via Firebase CLI or inherit from root `.env`:
```bash
firebase functions:config:set openai.api_key="your_key"
```

### Environment Variable Categories

| Category | Count | Examples | Sensitive |
|----------|-------|----------|-----------|
| Firebase Config | 6 | API_KEY, AUTH_DOMAIN, PROJECT_ID, etc. | ❌ Public |
| Firebase Deploy | 2 | FIREBASE_TOKEN, FIREBASE_PROJECT_ID | ✅ Private |
| OpenAI | 1 | OPENAI_API_KEY | ✅ Private |
| Google Cloud | 1 | GOOGLE_CLOUD_VISION_API_KEY | ✅ Private |
| Stripe Config | 3 | Publishable/Secret keys, Webhook secret | ⚠️ Mixed |
| Stripe Prices | 4 | Price IDs for 4 subscription tiers | ❌ Public |
| Mobile Build | 2 | EXPO_TOKEN, GOOGLE_PLAY_SERVICE_ACCOUNT_KEY | ✅ Private |
| Google OAuth | 3 | Client IDs for Web/iOS/Android | ❌ Public |
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

# Functions
cd functions
npm run build
```

### Test locally

```bash
# Use Firebase emulators for local testing
firebase emulators:start
```

## 🌐 Deployment

### Prerequisites

Before deploying, ensure all required secrets are configured:
- **For automated CI/CD**: See [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) for GitHub Actions secrets setup
- **For manual deployment**: Ensure Firebase CLI is authenticated and environment variables are set

### ⚠️ Important: Gen1 to Gen2 Migration

If you encounter deployment errors about "Upgrading from 1st Gen to 2nd Gen is not yet supported", see [FIREBASE_FUNCTIONS_MIGRATION.md](FIREBASE_FUNCTIONS_MIGRATION.md) for the complete migration guide.

**Quick fix:**
```bash
npm run deploy:migrate-gen2
```

This will delete old Gen1 functions and deploy the new Gen2 versions.

### Web Application

```bash
cd web
npm run build
cd ..
firebase deploy --only hosting
```

### Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### All-in-One Deployment

Deploy everything (hosting, storage, firestore rules, functions):
```bash
npm run deploy
```

For troubleshooting, see [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md).

### Custom Domain

Configure `www.SAVR.cam` in Firebase Hosting settings.

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

This is a proprietary SaaS application by InTellMe. Internal team contributions only.

## 📄 License

Proprietary - © 2026 InTellMe. All rights reserved.

## 🔗 Links

- **Production**: https://www.SAVR.cam
- **InTellMe**: https://intellmeai.com
- **Documentation**: See `/web/docs` and `/mobile/docs`

## 💬 Support

For issues or questions, contact the InTellMe development team.

---

Built with ❤️ by InTellMe - Integrity, Transparency, Independence, Progress
