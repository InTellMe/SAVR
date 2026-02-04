# Pantry Chef - Quick Start Guide

## Setup Instructions (5 Minutes)

### 1. Prerequisites
- Node.js 18+ installed
- Git installed
- Firebase account (free tier works)
- Stripe account (optional, for payments)

### 2. Clone and Install
```bash
git clone <repository-url>
cd PantryHustler/web
npm install
```

### 3. Firebase Setup

#### Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Follow the setup wizard
4. Enable Authentication (Email/Password and Google)
5. Create Firestore database (start in test mode)
6. Create Storage bucket

#### Get Firebase Config
1. Project Settings → General
2. Scroll to "Your apps"
3. Click web icon (</>) to add web app
4. Copy the config values

### 4. Configure Environment

Create `.env.local` file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase config:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc

# Optional - for Pro subscriptions
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...
```

### 5. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000 - you should see the landing page! 🎉

## Testing the Application

### 1. Create an Account
- Click "Sign Up"
- Enter email and password
- Or use "Sign in with Google"

### 2. Test Features

**Without Cloud Functions** (frontend only):
- ✅ Authentication (Sign up/Sign in)
- ✅ Dashboard view
- ✅ Navigation between pages
- ✅ UI/UX components
- ❌ Photo analysis (needs Cloud Function)
- ❌ Recipe generation (needs Cloud Function)
- ❌ Meal planning (needs Cloud Function)
- ❌ Grocery lists (needs Cloud Function)
- ❌ AI chat (needs Cloud Function)

**With Cloud Functions** (full functionality):
Deploy the Cloud Functions from `/functions` directory to enable all features.

### 3. Manual Data Entry
You can manually add inventory items by clicking "Add New Item" button (if implemented) or directly in Firestore console.

## Project Structure Quick Reference

```
web/
├── app/                    # Pages
│   ├── page.tsx           # Landing page ✨
│   ├── sign-in/           # Authentication
│   ├── sign-up/           
│   ├── dashboard/         # Main app
│   ├── inventory/         # Pantry management
│   ├── recipes/           # Recipe generation
│   ├── meal-plans/        # Meal planning
│   ├── grocery-lists/     # Shopping lists
│   ├── chat/              # AI assistant (Pro)
│   └── pricing/           # Subscription
├── components/            # Reusable UI
├── contexts/              # React contexts
└── lib/                   # Utilities
```

## Quick Commands

```bash
# Development
npm run dev              # Start dev server

# Production
npm run build           # Build for production
npm start               # Run production build

# Code Quality
npm run lint            # Run ESLint
```

## Common Issues & Solutions

### "Firebase: Error (auth/invalid-api-key)"
- Check your `.env.local` file exists
- Verify API key is correct
- Make sure to restart dev server after changing .env

### "Cannot find module '@/...'"
- The `@` alias points to the root directory
- Check `tsconfig.json` for path configuration

### Pages show but no data loads
- Check Firebase rules allow read/write
- Verify user is authenticated
- Check browser console for errors

### Build fails
- Run `npm install` to ensure dependencies
- Check TypeScript errors
- Verify all imports are correct

## Firebase Security Rules

### Development Rules (Firestore)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /inventory/{itemId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /recipes/{recipeId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /mealPlans/{planId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /groceryLists/{listId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /chats/{chatId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

### Development Rules (Storage)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /inventory/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Next Steps

1. **Deploy Cloud Functions** - Enable AI features
2. **Set up Stripe** - Enable Pro subscriptions
3. **Configure Production Rules** - Secure your data
4. **Add Custom Domain** - Brand your app
5. **Enable Analytics** - Track usage

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Need Help?

Check the full `IMPLEMENTATION_GUIDE.md` for detailed documentation.

Happy cooking! 👨‍🍳
