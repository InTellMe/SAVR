# SAVR API Documentation

## Overview

SAVR uses Firebase Cloud Functions as its backend API. All functions are callable HTTPS functions that require Firebase Authentication.

**Base URL**: `https://us-central1-[project-id].cloudfunctions.net`

## Authentication

All API endpoints require a valid Firebase ID token in the request.

**Web (Next.js)**:

```typescript
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const myFunction = httpsCallable(functions, "functionName");
const result = await myFunction({ data });
```

**Mobile (React Native)**:

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const myFunction = httpsCallable(functions, "functionName");
const result = await myFunction({ data });
```

## Endpoints

### 1. analyzeImage

Analyzes an uploaded image to extract ingredients using AI vision.

**Function Name**: `analyzeImage`

**Request**:

```typescript
{
  imageUrl: string; // Firebase Storage URL or public URL
}
```

**Response**:

```typescript
{
  success: boolean;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string; // Canonical unit when possible (e.g., 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'lb', 'oz', 'piece', 'can', 'bottle', 'package')
    confidence: number;
    approximate?: boolean; // true when the quantity is estimated
  }>;
}
```

**Errors**:

- `unauthenticated`: User not logged in
- `resource-exhausted`: Free tier inventory limit reached
- `internal`: Image analysis failed

**Example**:

```typescript
const analyzeImage = httpsCallable(functions, "analyzeImage");
const result = await analyzeImage({
  imageUrl: "https://storage.googleapis.com/.../image.jpg",
});

console.log(result.data.ingredients);
// [{ name: 'Milk', quantity: 1, unit: 'gallon', confidence: 0.95 }]
```

**Usage Limits**:

- Free: 50 total inventory items
- Pro: Unlimited

---

### 2. createRecipe

Generates a recipe based on available ingredients using GPT-4.

**Function Name**: `createRecipe`

**Request**:

```typescript
{
  ingredients: string[]; // Array of ingredient names
  preferences?: {
    cuisine?: string; // e.g., 'Italian', 'Mexican'
    dietary?: string[]; // e.g., ['vegetarian', 'gluten-free']
    difficulty?: 'easy' | 'medium' | 'hard';
    cookTime?: number; // Maximum cook time in minutes
  };
}
```

**Response**:

```typescript
{
  success: boolean;
  recipeId: string; // Firestore document ID
  recipe: {
    title: string;
    description: string;
    ingredients: Array<{
      name: string;
      quantity: number;
      unit: string; // Canonical unit when possible
      approximate?: boolean;
    }>;
    instructions: string[];
    prepTime: number; // minutes
    cookTime: number; // minutes
    servings: number;
    difficulty: 'easy' | 'medium' | 'hard';
    cuisine?: string;
    dietaryTags?: string[];
  };
}
```

**Errors**:

- `unauthenticated`: User not logged in
- `resource-exhausted`: Monthly recipe limit reached (free tier)
- `internal`: Recipe generation failed

**Example**:

```typescript
const createRecipe = httpsCallable(functions, "createRecipe");
const result = await createRecipe({
  ingredients: ["chicken", "tomatoes", "pasta"],
  preferences: {
    cuisine: "Italian",
    difficulty: "easy",
    cookTime: 30,
  },
});

console.log(result.data.recipe.title);
// "Easy Italian Chicken Pasta"
```

**Usage Limits**:

- Free: 10 recipes per month
- Pro: Unlimited

---

### 3. createMealPlan

Generates a multi-day meal plan with recipes.

**Function Name**: `createMealPlan`

**Request**:

```typescript
{
  days: number; // 1-14
  ingredients: string[]; // Available ingredients
  preferences?: {
    mealsPerDay?: number; // 1-3 (default: 3)
    dietary?: string[]; // Dietary restrictions
    variety?: boolean; // Ensure meal variety (default: true)
  };
}
```

**Response**:

```typescript
{
  success: boolean;
  mealPlanId: string;
  mealPlan: {
    name: string;
    meals: Array<{
      day: number;
      mealType: "breakfast" | "lunch" | "dinner";
      recipeName: string;
      ingredients: string[];
    }>;
  }
}
```

**Errors**:

- `unauthenticated`: User not logged in
- `resource-exhausted`: Monthly meal plan limit reached (free tier)
- `internal`: Meal plan generation failed

**Example**:

```typescript
const createMealPlan = httpsCallable(functions, "createMealPlan");
const result = await createMealPlan({
  days: 7,
  ingredients: ["chicken", "rice", "vegetables", "eggs"],
  preferences: {
    mealsPerDay: 3,
    dietary: ["gluten-free"],
  },
});

console.log(result.data.mealPlan.meals);
```

**Usage Limits**:

- Free: 2 meal plans per month
- Pro: Unlimited

---

### 4. createGroceryList

Generates a grocery list based on recipes and current inventory.

**Function Name**: `createGroceryList`

**Request**:

```typescript
{
  recipeIds: string[]; // Firestore recipe document IDs
}
```

**Response**:

```typescript
{
  success: boolean;
  listId: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string; // Canonical unit when possible
    category: "produce" | "dairy" | "meat" | "pantry";
    approximate?: boolean;
  }>;
}
```

**Errors**:

- `unauthenticated`: User not logged in
- `internal`: Grocery list generation failed

**Example**:

```typescript
const createGroceryList = httpsCallable(functions, "createGroceryList");
const result = await createGroceryList({
  recipeIds: ["recipe123", "recipe456"],
});

console.log(result.data.items);
// [{ name: 'Milk', quantity: 2, unit: 'cups', category: 'dairy' }]
```

**Usage Limits**:

- Free: Unlimited
- Pro: Unlimited

---

### 5. chat

Provides conversational cooking assistance (Pro tier only).

**Function Name**: `chat`

**Request**:

```typescript
{
  message: string; // User's question or message
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  contextData?: {
    inventory?: string[]; // Current inventory items
    currentRecipe?: any; // Recipe being cooked
  };
}
```

**Response**:

```typescript
{
  success: boolean;
  response: string; // AI assistant's response
}
```

**Errors**:

- `unauthenticated`: User not logged in
- `permission-denied`: Free tier users (Pro only feature)
- `internal`: Chat processing failed

**Example**:

```typescript
const chat = httpsCallable(functions, "chat");
const result = await chat({
  message: "How do I prevent pasta from sticking?",
  conversationHistory: [],
  contextData: {
    currentRecipe: { title: "Spaghetti Carbonara" },
  },
});

console.log(result.data.response);
// "To prevent pasta from sticking, make sure to use plenty of boiling water..."
```

**Usage Limits**:

- Free: Not available
- Pro: Unlimited

---

## AI Models and Fallback Behavior

SAVR uses OpenAI models with built-in fallback logic for robustness and consistent typed responses:

- **Image analysis (`analyzeImage`)**:
  - Primary: OpenAI vision-capable model (default `gpt-4o`) via Chat Completions with image input.
  - Fallback: Google Cloud Vision labels, post-processed by an OpenAI text model into structured ingredients.
- **Recipe generation (`createRecipe`)**:
  - Primary: OpenAI text model (default `gpt-4o`), with fallback to a smaller model (default `gpt-4o-mini`) on retryable errors (429, 5xx).
- **Meal plan generation (`createMealPlan`)**:
  - Primary: OpenAI text model (default `gpt-4o`), with fallback to `gpt-4o-mini` on retryable errors.
- **Grocery list generation (`createGroceryList`)**:
  - Primary: OpenAI text model (default `gpt-4o-mini`), with fallback to `gpt-4o` on retryable errors.
- **Chat assistant (`chat`)**:
  - Primary: OpenAI text model (default `gpt-4o`), with fallback to `gpt-4o-mini` on retryable errors.

Model names can be overridden via environment variables (e.g., `OPENAI_MODEL_CHAT_PRIMARY`, `OPENAI_MODEL_CHAT_FALLBACK`) without changing client code. All AI endpoints normalize units and quantities in their responses so the API contracts above remain consistent regardless of which model handles the request.

### 6. createStripeCheckout

Creates a Stripe checkout session for subscription.

**Function Name**: `createStripeCheckout`

**Request**:

```typescript
{
  priceId: string; // Stripe Price ID (monthly or yearly)
  successUrl: string; // Redirect after successful payment
  cancelUrl: string; // Redirect if cancelled
}
```

**Response**:

```typescript
{
  success: boolean;
  url: string; // Stripe Checkout URL to redirect to
}
```

**Errors**:

- `unauthenticated`: User not logged in
- `internal`: Stripe error

**Example**:

```typescript
const createStripeCheckout = httpsCallable(functions, "createStripeCheckout");
const result = await createStripeCheckout({
  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY, // or BASIC_MONTHLY, BASIC_YEARLY, PRO_YEARLY
  successUrl: `${window.location.origin}/dashboard?success=true`,
  cancelUrl: `${window.location.origin}/pricing`,
});

// Redirect to Stripe Checkout (supports coupon codes, skips payment if $0.00)
window.location.href = result.data.url;
```

---

### 7. createStripePortal

Creates a Stripe Customer Portal session for managing subscription.

**Function Name**: `createStripePortal`

**Request**:

```typescript
{
  returnUrl: string; // URL to return to after portal session
}
```

**Response**:

```typescript
{
  success: boolean;
  url: string; // Stripe Portal URL to redirect to
}
```

**Errors**:

- `unauthenticated`: User not logged in
- `internal`: No Stripe customer found or other error

**Example**:

```typescript
const createStripePortal = httpsCallable(functions, "createStripePortal");
const result = await createStripePortal({
  returnUrl: `${window.location.origin}/dashboard`,
});

// Redirect to Stripe Portal
window.location.href = result.data.url;
```

---

### 8. stripeWebhook

Webhook endpoint for Stripe events (not directly callable).

**Endpoint**: `POST /stripeWebhook`

**Headers**:

```
stripe-signature: [Stripe signature header]
```

**Events Handled**:

- `checkout.session.completed`: New subscription created
- `customer.subscription.updated`: Subscription status changed
- `customer.subscription.deleted`: Subscription cancelled
- `invoice.payment_failed`: Payment failed

This endpoint is called by Stripe, not by client applications.

---

### 9. onUserCreate

Firebase Auth trigger (not directly callable).

Automatically creates a user document in Firestore when a new user signs up.

**Trigger**: `auth.user().onCreate`

**Creates**:

```typescript
{
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  subscriptionTier: 'free'; // Default
  subscriptionStatus: 'active';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Data Models

### User Document

**Collection**: `users/{userId}`

Entitlement fields (`subscriptionTier`, `subscriptionStatus`, `stripeCustomerId`) are updated only by Cloud Functions via Stripe webhooks; clients cannot write them.

```typescript
{
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  subscriptionTier: 'free' | 'pro';
  subscriptionStatus: 'active' | 'cancelled' | 'past_due';
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Inventory Item

**Collection**: `inventory/{userId}/items/{itemId}`

```typescript
{
  id: string;
  userId: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'pantry' | 'fridge' | 'freezer';
  expiryDate?: Date;
  addedDate: Date;
  imageUrl?: string;
}
```

### Recipe

**Collection**: `recipes/{userId}/items/{recipeId}`

```typescript
{
  id: string;
  userId: string;
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  dietaryTags?: string[];
  generatedBy: 'ai' | 'user';
  createdAt: Date;
}
```

### Meal Plan

**Collection**: `mealPlans/{userId}/plans/{planId}`

```typescript
{
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  meals: Array<{
    date: Date;
    mealType: "breakfast" | "lunch" | "dinner" | "snack";
    recipeId?: string;
    recipeName: string;
  }>;
  createdAt: Date;
}
```

### Grocery List

**Collection**: `groceryLists/{userId}/lists/{listId}`

```typescript
{
  id: string;
  userId: string;
  name: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    checked: boolean;
    category?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Subscription Record

**Collection**: `subscriptions/{userId}`

Written only by Cloud Functions (Stripe and PayPal webhooks). One document per user; merges provider-specific fields.

```typescript
{
  userId: string;
  provider: 'stripe';
  stripeSubscriptionId?: string;
  status: 'active' | 'cancelled' | 'past_due';
  startDate?: Date;
  endDate?: Date | null;
  updatedAt: Date;
}
```

### Chat Message

**Collection**: `chatHistory/{userId}/messages/{messageId}`

```typescript
{
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
```

---

## Rate Limits

### Free Tier

- 50 inventory items total
- 10 recipe generations per month
- 2 meal plans per month
- No AI chat access

### Pro Tier

- Unlimited inventory items
- Unlimited recipe generations
- Unlimited meal plans
- Unlimited AI chat

### Global Limits (Both Tiers)

- 100 API calls per minute per user
- 10 MB max image size
- 5 images per request (inventory)

---

## Error Handling

All errors follow this format:

```typescript
{
  code: string; // e.g., 'unauthenticated', 'resource-exhausted'
  message: string; // Human-readable error message
  details?: any; // Additional error details
}
```

**Common Error Codes**:

- `unauthenticated`: User not logged in
- `permission-denied`: Insufficient permissions or tier
- `resource-exhausted`: Usage limit reached
- `invalid-argument`: Invalid input data
- `not-found`: Resource not found
- `already-exists`: Resource already exists
- `internal`: Server error

**Example Error Handling**:

```typescript
try {
  const result = await myFunction({ data });
  console.log(result.data);
} catch (error: any) {
  console.error("Error:", error.code, error.message);

  if (error.code === "resource-exhausted") {
    // Show upgrade prompt
  } else if (error.code === "unauthenticated") {
    // Redirect to login
  }
}
```

---

## Best Practices

1. **Always handle errors**: Wrap all function calls in try-catch
2. **Show loading states**: Functions can take 5-30 seconds
3. **Cache results**: Store recipes and meal plans locally
4. **Validate inputs**: Check data before calling functions
5. **Respect limits**: Check user tier before allowing actions
6. **Use context**: Pass relevant context to AI functions for better results

---

**Last Updated**: February 2026
**Version**: 1.0.0
