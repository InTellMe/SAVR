# SAVR Web Application

A modern Next.js web application for smart pantry management, recipe generation, meal planning, and AI-powered cooking assistance.

## Features

- 🔐 **Authentication**: Email/password and Google sign-in
- 📸 **Smart Inventory**: Upload photos to automatically identify ingredients
- 🍳 **Recipe Generation**: AI-powered recipes based on your inventory
- 📅 **Meal Planning**: Create weekly meal plans
- 🛒 **Grocery Lists**: Smart shopping lists with categories
- 💬 **AI Chat Assistant**: Get cooking tips and advice (Pro feature)
- 💳 **Stripe Integration**: Subscription management

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project configured
- Stripe account for payments (optional)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` file from template:

```bash
cp .env.example .env.local
```

3. Add your Firebase and Stripe credentials to `.env.local`

4. Run development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
web/
├── app/                    # Next.js 16 App Router
│   ├── page.tsx           # Landing page
│   ├── sign-in/           # Sign in page
│   ├── sign-up/           # Sign up page
│   ├── dashboard/         # User dashboard
│   ├── inventory/         # Inventory management
│   ├── recipes/           # Recipe generation
│   ├── meal-plans/        # Meal planning
│   ├── grocery-lists/     # Shopping lists
│   ├── chat/              # AI assistant (Pro)
│   └── pricing/           # Subscription plans
├── components/            # Reusable components
│   ├── Navbar.tsx         # Navigation bar
│   ├── ProtectedRoute.tsx # Auth wrapper
│   ├── ImageUpload.tsx    # File upload
│   └── LoadingSpinner.tsx # Loading state
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication context
└── lib/                   # Utilities
    └── firebase.ts        # Firebase config
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

See `.env.example` for required environment variables.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage
- **Functions**: Firebase Cloud Functions
- **Payments**: Stripe

## Firebase Cloud Functions

The app integrates with these Cloud Functions:

- `analyzeImage` - Analyze pantry photos
- `createRecipe` - Generate recipes
- `createMealPlan` - Create meal plans
- `createGroceryList` - Generate shopping lists
- `chat` - AI cooking assistant
- `createStripeCheckout` - Payment checkout

## License

MIT
