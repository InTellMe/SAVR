# PantryHustler by InTellMe

PantryHustler is an AI-powered food management platform that helps you manage your pantry inventory, generate recipes, plan meals, and create grocery lists. Built as a Firebase-hosted React/Next.js web application focusing on a web-based MVP where users upload photos of their pantry and fridge to manage inventory.

## 🌟 Features

### Core Features
- **AI Image Recognition**: Upload photos of your pantry/fridge and let OpenAI Vision (with Google Vision fallback) automatically extract ingredients
- **Smart Inventory Management**: Track what you have, when it expires, and where it's stored
- **AI Recipe Generation**: Get personalized recipes based on your available ingredients using GPT-4
- **Meal Planning**: Create weekly meal plans tailored to your dietary preferences
- **Grocery Lists**: Automatically generate shopping lists from meal plans
- **Cooking Assistant**: Chat with an AI assistant for cooking tips and recipe help (Pro tier)

### Subscription Tiers
- **Free Tier**: 50 inventory items, 10 recipes/month, 2 meal plans/month
- **Pro Tier**: Unlimited items, recipes, meal plans, AI chat, advanced features

### Payment Options
- Stripe checkout (credit/debit cards)
- PayPal integration (web checkout)
- Server-side subscription validation and gating

## 🏗️ Architecture

**Note**: This is currently a web-based MVP. Users upload photos through the web application to manage their pantry inventory. Mobile apps are available but the primary focus is on the web platform.

### Web Application (`/web`) - Primary Platform
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Storage)
- **Hosting**: Firebase Hosting at pantryhustler.com
- **Key Feature**: Photo upload for pantry/fridge inventory management

### Mobile Application (`/mobile`) - Future Expansion
- **Framework**: Expo React Native with TypeScript
- **Navigation**: React Navigation
- **Backend**: Shared Firebase infrastructure with web app
- **Platforms**: iOS and Android
- **Status**: Available for future development, but web is the current focus

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
git clone https://github.com/InTellMe/PantryHustler.git
cd PantryHustler
```

2. **Configure environment variables**
```bash
# Copy the example file
cp .env.example .env.local

# Add your Firebase and API keys
# - Firebase configuration from Firebase Console
# - OpenAI API key from OpenAI
# - Stripe keys from Stripe Dashboard
```

3. **Install dependencies**
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

4. **Deploy Firebase infrastructure**
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

5. **Run the web app locally** (Primary Platform)
```bash
cd web
npm run dev
```

Visit `http://localhost:3000` to access the web application where you can upload photos of your pantry and fridge!

6. **Run the mobile app locally** (optional - future expansion)
```bash
cd mobile
npm start
# Then press 'a' for Android or 'i' for iOS
```

## 📁 Project Structure

```
PantryHustler/
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

## 🧪 Development

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

### Custom Domain
Configure `pantryhustler.com` in Firebase Hosting settings.

## 📊 Tech Stack

- **Frontend**: React, Next.js 15, TypeScript, Tailwind CSS
- **Mobile**: React Native, Expo, TypeScript
- **Backend**: Firebase (Auth, Firestore, Functions, Storage, Hosting)
- **AI**: OpenAI GPT-4, OpenAI Vision, Google Cloud Vision
- **Payments**: Stripe, PayPal
- **Deployment**: Firebase Hosting, Cloud Functions

## 🤝 Contributing

This is a proprietary SaaS application by InTellMe. Internal team contributions only.

## 📄 License

Proprietary - © 2026 InTellMe. All rights reserved.

## 🔗 Links

- **Production**: https://pantryhustler.com
- **InTellMe**: https://intellmeai.com
- **Documentation**: See `/web/docs` and `/mobile/docs`

## 💬 Support

For issues or questions, contact the InTellMe development team.

---

Built with ❤️ by InTellMe - Integrity, Transparency, Independence, Progress

