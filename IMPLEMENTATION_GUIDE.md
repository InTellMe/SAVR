# SAVR Web Application - Complete Implementation Guide

## Overview

This is a fully functional Next.js 14 web application for SAVR - a smart cooking assistant that helps users manage their pantry inventory, generate recipes, plan meals, and get AI-powered cooking assistance.

## Application Structure

### Pages

1. **Landing Page (`/`)**

   - Hero section with value proposition
   - Features showcase (6 key features)
   - How it works (4-step process)
   - Call-to-action sections
   - Footer

2. **Authentication**

   - **Sign In (`/sign-in`)**: Email/password and Google OAuth
   - **Sign Up (`/sign-up`)**: Account creation with validation

3. **Protected Pages** (require authentication)
   - **Dashboard (`/dashboard`)**: User overview with stats and quick actions
   - **Inventory (`/inventory`)**: Photo upload, AI analysis, CRUD operations
   - **Recipes (`/recipes`)**: AI recipe generation with customization
   - **Meal Plans (`/meal-plans`)**: Weekly meal planning
   - **Grocery Lists (`/grocery-lists`)**: Categorized shopping lists
   - **Chat (`/chat`)**: AI cooking assistant (Pro tier only)
   - **Pricing (`/pricing`)**: Subscription plans with Stripe checkout

## Key Features

### 1. Smart Inventory Management

- **Image Upload**: Drag-and-drop or click to upload pantry photos
- **AI Analysis**: Automatically identifies ingredients from photos
- **CRUD Operations**: Add, edit, delete inventory items
- **Categorization**: Items organized by category
- **Expiry Tracking**: Optional expiration date tracking

### 2. Recipe Generation

- **AI-Powered**: Generates recipes based on available ingredients
- **Customization Options**:
  - Dietary restrictions (vegetarian, vegan, gluten-free, etc.)
  - Cuisine preferences
  - Skill level (beginner, intermediate, advanced)
  - Maximum cooking time
- **Detailed Views**: Full recipe with ingredients and step-by-step instructions
- **Save & Manage**: Store favorite recipes

### 3. Meal Planning

- **Multi-Day Plans**: Create plans for 1-14 days
- **Flexible Meals**: 1-3 meals per day
- **Calendar View**: Visual weekly meal schedule
- **Dietary Preferences**: Apply restrictions to entire plan

### 4. Grocery Lists

- **Smart Generation**: Based on meal plans and current inventory
- **Categorized Items**: Organized by food categories
- **Interactive Checkboxes**: Track shopping progress
- **Progress Tracking**: Visual progress bar

### 5. AI Chat Assistant (Pro Feature)

- **Conversational Interface**: Real-time chat with AI chef
- **Cooking Tips**: Get advice on techniques and substitutions
- **Recipe Help**: Ask questions about any recipe
- **History**: Full conversation history preserved

### 6. Subscription Management

- **Free Tier**: Basic features with limits
- **Pro Tier**: Unlimited access and AI chat
- **Stripe Integration**: Secure payment processing
- **Easy Upgrades**: One-click upgrade flow

## Technical Implementation

### Frontend Stack

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe code
- **Tailwind CSS**: Utility-first styling
- **React Hooks**: Modern state management

### Backend Integration

- **Firebase Authentication**: User management
- **Cloud Firestore**: NoSQL database
- **Firebase Storage**: Image storage
- **Cloud Functions**: Serverless backend
- **Stripe**: Payment processing

### Key Components

#### 1. Navbar (`components/Navbar.tsx`)

- Responsive navigation
- Auth state display
- Dynamic menu based on authentication
- Active page highlighting

#### 2. ProtectedRoute (`components/ProtectedRoute.tsx`)

- Authentication guard
- Pro tier checking
- Automatic redirects
- Loading states

#### 3. ImageUpload (`components/ImageUpload.tsx`)

- Drag-and-drop interface
- Image preview
- File type validation
- Loading feedback

#### 4. LoadingSpinner (`components/LoadingSpinner.tsx`)

- Reusable loading indicator
- Multiple sizes
- Consistent styling

### Authentication Flow

1. **Sign Up**:

   ```
   User submits form → Firebase creates user →
   Create Firestore user document (UID as ID) →
   Redirect to dashboard
   ```

2. **Sign In**:

   ```
   User submits credentials → Firebase authenticates →
   Load user data from Firestore →
   Redirect to dashboard
   ```

3. **Google OAuth**:
   ```
   User clicks Google button → OAuth popup →
   Create/merge user document →
   Redirect to dashboard
   ```

### Data Models

#### User Document (`users/{uid}`)

```typescript
{
  uid: string;
  email: string;
  displayName?: string;
  subscriptionTier: 'free' | 'pro';
  subscriptionStatus: string;
  createdAt: string;
}
```

#### Inventory Item (`inventory/{id}`)

```typescript
{
  userId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: string;
  imageUrl?: string;
  createdAt: string;
}
```

#### Recipe (`recipes/{id}`)

```typescript
{
  userId: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cookingTime: number;
  servings: number;
  difficulty: string;
  cuisine?: string;
  createdAt: string;
}
```

#### Meal Plan (`mealPlans/{id}`)

```typescript
{
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  meals: Array<{
    date: string;
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  }>;
  createdAt: string;
}
```

#### Grocery List (`groceryLists/{id}`)

```typescript
{
  userId: string;
  name: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
    checked: boolean;
  }>;
  createdAt: string;
}
```

#### Chat Message (`chats/{id}`)

```typescript
{
  userId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
```

## Cloud Functions Integration

### 1. analyzeImage

- **Input**: `{ imageUrl: string }`
- **Output**: `{ items: Array<{name, quantity, unit, category}> }`
- **Purpose**: Analyze pantry photos using Vision API

### 2. createRecipe

- **Input**:
  ```typescript
  {
    ingredients: string[];
    dietaryRestrictions: string[];
    cuisinePreference?: string;
    skillLevel: string;
    maxCookingTime: number;
  }
  ```
- **Output**: Recipe object
- **Purpose**: Generate recipes using OpenAI

### 3. createMealPlan

- **Input**:
  ```typescript
  {
    ingredients: string[];
    days: number;
    mealsPerDay: number;
    dietaryRestrictions: string[];
  }
  ```
- **Output**: MealPlan object
- **Purpose**: Create weekly meal plans

### 4. createGroceryList

- **Input**:
  ```typescript
  {
    currentInventory: Array<{name, quantity}>;
    mealPlans: any[];
  }
  ```
- **Output**: GroceryList object
- **Purpose**: Generate smart shopping lists

### 5. chat

- **Input**:
  ```typescript
  {
    message: string;
    history: Message[];
  }
  ```
- **Output**: `{ response: string }`
- **Purpose**: AI cooking assistant

### 6. createStripeCheckout

- **Input**: `{ priceId: string }`
- **Output**: `{ url: string }`
- **Purpose**: Create Stripe checkout session

## Environment Setup

Required environment variables (`.env.local`):

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PRICE_ID=
```

## Development Workflow

1. **Start Development Server**:

   ```bash
   npm run dev
   ```

2. **Build for Production**:

   ```bash
   npm run build
   ```

3. **Start Production Server**:

   ```bash
   npm start
   ```

4. **Run Linter**:
   ```bash
   npm run lint
   ```

## User Experience Features

### Loading States

- Spinners during async operations
- Skeleton screens for data loading
- Disabled buttons during processing
- Clear feedback messages

### Error Handling

- User-friendly error messages
- Form validation feedback
- Network error handling
- Graceful fallbacks

### Responsive Design

- Mobile-first approach
- Breakpoints: sm, md, lg
- Touch-friendly interfaces
- Optimized layouts

### Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management

## Security Considerations

1. **Authentication**:

   - Firebase handles password security
   - Secure token management
   - Protected route enforcement

2. **Data Access**:

   - User-scoped queries
   - Firestore security rules
   - No direct database access

3. **API Security**:

   - Cloud Functions authentication
   - HTTPS only
   - CORS configured

4. **Payment Security**:
   - Stripe handles payment data
   - No credit card storage
   - PCI compliance

## Performance Optimization

1. **Code Splitting**: Automatic with Next.js
2. **Image Optimization**: Next.js Image component
3. **Static Generation**: Pre-rendered pages
4. **Lazy Loading**: Components loaded on demand
5. **Caching**: Browser and CDN caching

## Future Enhancements

Potential features for future versions:

- Recipe sharing and social features
- Nutrition tracking
- Barcode scanning
- Recipe collections/cookbooks
- Shopping list sharing
- Voice input for recipes
- Multi-language support
- Dark mode
- Recipe scaling
- Print-friendly recipe format

## Troubleshooting

### Common Issues

1. **Build Errors**:

   - Ensure all environment variables are set
   - Check Firebase configuration
   - Verify Node.js version (18+)

2. **Authentication Issues**:

   - Check Firebase console for enabled providers
   - Verify authorized domains
   - Check API key validity

3. **Upload Failures**:

   - Verify Storage bucket configuration
   - Check file size limits
   - Ensure proper permissions

4. **Payment Issues**:
   - Verify Stripe keys
   - Check webhook configuration
   - Review Stripe dashboard logs

## Support and Documentation

- **Next.js Docs**: https://nextjs.org/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Stripe Docs**: https://stripe.com/docs

## License

MIT License - See LICENSE file for details
