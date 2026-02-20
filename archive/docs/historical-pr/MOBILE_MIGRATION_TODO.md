# Mobile App Firebase to Supabase Migration - Task for GitHub Copilot Agent

## Context

The web application has been fully migrated from Firebase to Supabase. However, the mobile app (`/mobile`) still uses Firebase and needs to be migrated to match the web app architecture.

**Current Status:**
- ✅ Web app: Fully migrated to Supabase (auth, database, storage, API routes)
- ⏳ Mobile app: Still using Firebase (needs migration)

**Important Notes:**
- The mobile app already has Supabase client configured in `mobile/src/config/supabase.ts`
- The mobile app already has an API client helper in `mobile/src/utils/api.ts` that can call Vercel API routes
- All backend API routes are implemented and working in `/web/app/api`

## Objective

Migrate the React Native mobile app from Firebase to Supabase, ensuring feature parity with the web app.

## Files That Need Migration

### High Priority - Core Screens (Using Firebase Firestore)

1. **`mobile/src/screens/main/InventoryScreen.tsx`**
   - Current: Uses Firebase Firestore queries (`collection`, `query`, `where`, `getDocs`, `addDoc`, `deleteDoc`)
   - Current: Uses Firebase Functions (`httpsCallable` for `analyzeImage`)
   - Migration: Replace with Supabase database queries and API route calls
   - Tables: `inventory` table
   - API routes: `/api/ai/analyze-image`

2. **`mobile/src/screens/main/RecipesScreen.tsx`**
   - Current: Uses Firebase Firestore queries
   - Current: Uses Firebase Functions (`httpsCallable` for `createRecipe`)
   - Migration: Replace with Supabase database queries and API route calls
   - Tables: `recipes` table
   - API routes: `/api/ai/create-recipe`

3. **`mobile/src/screens/main/RecipeDetailScreen.tsx`**
   - Current: Uses Firebase Firestore (`getDoc`)
   - Migration: Replace with Supabase database query
   - Tables: `recipes` table

4. **`mobile/src/screens/main/MealPlansScreen.tsx`**
   - Current: Uses Firebase Firestore queries
   - Current: Uses Firebase Functions (`httpsCallable` for `generateMealPlan`)
   - Migration: Replace with Supabase database queries and API route calls
   - Tables: `meal_plans` table
   - API routes: `/api/ai/create-meal-plan`

5. **`mobile/src/screens/main/GroceryListScreen.tsx`**
   - Current: Uses Firebase Firestore queries (`collection`, `getDocs`, `updateDoc`)
   - Migration: Replace with Supabase database queries
   - Tables: `grocery_lists` table

6. **`mobile/src/screens/main/HomeScreen.tsx`**
   - Current: Uses Firebase Firestore queries with complex filters (`collection`, `getDocs`, `orderBy`, `limit`)
   - Migration: Replace with Supabase database queries
   - Tables: `inventory`, `recipes`, `meal_plans`

7. **`mobile/src/screens/main/ChatScreen.tsx`**
   - Current: Uses Firebase Functions (`httpsCallable` for `chatWithAI`)
   - Migration: Replace with API route call
   - API routes: `/api/ai/chat`

8. **`mobile/src/screens/main/LabelingScreen.tsx`**
   - Current: Uses Firebase Functions for ML labeling
   - Migration: Replace with API route calls
   - API routes: `/api/labeling/*`

### Configuration Files

9. **`mobile/src/config/firebase.ts`**
   - Action: DELETE this file after migration is complete
   - Note: Supabase config already exists in `mobile/src/config/supabase.ts`

## Migration Strategy

### Step 1: Create Database Helper Functions

Create a new file `mobile/src/lib/db.ts` with Supabase database helper functions:

```typescript
import { supabase } from '../config/supabase';

// Example: Get inventory items
export async function getInventory(userId: string) {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Example: Add inventory item
export async function addInventoryItem(userId: string, item: any) {
  const { data, error } = await supabase
    .from('inventory')
    .insert({ user_id: userId, ...item })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Add similar functions for recipes, meal_plans, grocery_lists, etc.
```

### Step 2: Update Screens One-by-One

For each screen:

1. **Remove Firebase imports:**
   ```typescript
   // REMOVE:
   import { collection, query, where, getDocs } from 'firebase/firestore';
   import { db } from '../config/firebase';
   import { httpsCallable } from 'firebase/functions';
   ```

2. **Add Supabase/API imports:**
   ```typescript
   // ADD:
   import { getInventory, addInventoryItem } from '../lib/db';
   import { analyzeImage } from '../utils/api';
   ```

3. **Replace Firebase queries with Supabase:**
   ```typescript
   // BEFORE (Firebase):
   const q = query(
     collection(db, 'inventory'),
     where('userId', '==', user.uid)
   );
   const snapshot = await getDocs(q);
   const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

   // AFTER (Supabase):
   const items = await getInventory(user.id);
   ```

4. **Replace Firebase Functions with API calls:**
   ```typescript
   // BEFORE (Firebase):
   const analyzeImage = httpsCallable(functions, 'analyzeImage');
   const result = await analyzeImage({ imageUrl });
   const data = result.data;

   // AFTER (API route):
   const data = await analyzeImage(imageUrl);
   ```

### Step 3: Update package.json

Remove Firebase dependency:
```bash
cd mobile
npm uninstall firebase
```

### Step 4: Delete Firebase Config

```bash
rm mobile/src/config/firebase.ts
```

### Step 5: Test Thoroughly

- Test each screen individually
- Verify data fetching works
- Verify data mutations work (create, update, delete)
- Verify AI features work (recipe generation, meal planning, etc.)
- Test on both iOS and Android
- Test offline behavior (Supabase supports offline caching)

## Database Schema Reference

The Supabase database tables are defined in `/supabase/migrations/`. Key tables:

- **users**: User profiles and subscription info
- **inventory**: Inventory items with categories
- **recipes**: User recipes (manual and AI-generated)
- **meal_plans**: Meal plans with date ranges
- **grocery_lists**: Shopping lists with items
- **chat_history**: AI chat messages
- **transfer_sessions**: Photo transfer sessions
- **images**: ML labeling image documents
- **annotations**: ML annotations
- **categories**: ML category labels

All tables have Row Level Security (RLS) policies that enforce user isolation.

## API Routes Reference

All API routes are in `/web/app/api/`:

**AI Routes:**
- `POST /api/ai/analyze-image` - Analyze food images
- `POST /api/ai/chat` - AI chat assistant
- `POST /api/ai/create-recipe` - Generate recipes
- `POST /api/ai/create-meal-plan` - Generate meal plans
- `POST /api/ai/create-grocery-list` - Generate grocery lists
- `POST /api/ai/scan-receipt` - Scan receipt images
- `POST /api/ai/import-recipe` - Import recipe from URL
- `POST /api/ai/get-substitution` - Get ingredient substitutions

**Inventory Routes:**
- `POST /api/inventory/deduct` - Deduct ingredients from inventory

**Stripe Routes:**
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `POST /api/stripe/portal` - Create customer portal session

**Transfer Routes:**
- `POST /api/transfer/create-session` - Create photo transfer session

**ML Labeling Routes:**
- `POST /api/labeling/upload` - Upload labeling image
- `GET /api/labeling/annotations` - Get image annotations
- `POST /api/labeling/save-annotation` - Save annotations
- `POST /api/labeling/segment` - Trigger segmentation
- `POST /api/labeling/export` - Export dataset

## Authentication

The mobile app already uses Supabase Auth via `mobile/src/config/supabase.ts`. The existing authentication flow should continue to work - just ensure you're getting the user from Supabase instead of Firebase:

```typescript
// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Get session for API calls (already done in api.ts)
const { data: { session } } = await supabase.auth.getSession();
```

## Realtime Subscriptions

If any screens use Firebase `onSnapshot` for realtime updates, replace with Supabase realtime:

```typescript
// BEFORE (Firebase):
const unsubscribe = onSnapshot(doc(db, 'inventory', id), (snapshot) => {
  setItem(snapshot.data());
});

// AFTER (Supabase):
const channel = supabase
  .channel('inventory_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'inventory',
      filter: `id=eq.${id}`,
    },
    (payload) => {
      setItem(payload.new);
    }
  )
  .subscribe();

// Cleanup
return () => { channel.unsubscribe(); };
```

## Estimated Effort

- **Time**: 6-8 hours
- **Complexity**: Medium
- **Risk**: Low (web app migration is complete, so patterns are established)

## Success Criteria

- [ ] All Firebase imports removed from mobile screens
- [ ] All screens fetch data from Supabase database
- [ ] All AI features call Vercel API routes
- [ ] `mobile/src/config/firebase.ts` deleted
- [ ] Firebase dependency removed from `mobile/package.json`
- [ ] Mobile app builds successfully for iOS and Android
- [ ] All features tested and working on real devices
- [ ] No regression in functionality

## Testing Checklist

- [ ] Inventory management (add, edit, delete items)
- [ ] Recipe browsing and creation
- [ ] Meal plan generation
- [ ] Grocery list management
- [ ] AI chat functionality
- [ ] Image analysis for inventory
- [ ] Receipt scanning
- [ ] ML labeling (if used)
- [ ] User authentication (sign in, sign up, sign out)
- [ ] Subscription status checks
- [ ] Offline functionality

## Resources

- Web app examples: `/web/app/` (all pages now use Supabase)
- Database helpers: `/web/lib/db.ts` (can be used as reference for mobile helpers)
- API client: `/web/lib/api.ts` (similar to mobile's `/mobile/src/utils/api.ts`)
- Supabase docs: https://supabase.com/docs
- React Native Supabase: https://supabase.com/docs/guides/getting-started/tutorials/with-react-native

## Notes

- The mobile app can be migrated incrementally (screen by screen)
- Start with a single screen (e.g., InventoryScreen) to establish the pattern
- Use the web app as a reference - the patterns are identical
- The API routes are already tested and working from the web app
- Supabase Row Level Security policies are already configured

## Contact

If you encounter issues during migration:
1. Check `/web/app/` for working examples
2. Review Supabase migration files in `/supabase/migrations/`
3. Check API route implementations in `/web/app/api/`
4. Refer to `TESTING_PLAN.md` for testing guidelines
