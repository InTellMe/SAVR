# PR Plan: CRUD Operations Migration (Firestore → Postgres)

## Overview
Migrate all database CRUD operations from Firebase Firestore to Supabase Postgres. This PR will update application code across web and mobile to use Supabase client instead of Firestore.

## Scope

### Web Application Changes

#### 1. Inventory Operations
**Files to modify:**
- `web/app/inventory/page.tsx`
- Any shared inventory utilities

**Current Firestore pattern:**
```typescript
// Read
const inventorySnapshot = await db
  .collection('inventory')
  .doc(userId)
  .collection('items')
  .get();

// Write
await db
  .collection('inventory')
  .doc(userId)
  .collection('items')
  .add(newItem);

// Update
await db
  .collection('inventory')
  .doc(userId)
  .collection('items')
  .doc(itemId)
  .update(updates);

// Delete
await db
  .collection('inventory')
  .doc(userId)
  .collection('items')
  .doc(itemId)
  .delete();
```

**New Supabase pattern:**
```typescript
// Read
const { data, error } = await supabase
  .from('inventory')
  .select('*')
  .eq('user_id', userId);

// Insert
const { data, error } = await supabase
  .from('inventory')
  .insert({
    user_id: userId,
    name: item.name,
    quantity: item.quantity,
    // ... other fields
  });

// Update
const { data, error } = await supabase
  .from('inventory')
  .update(updates)
  .eq('id', itemId)
  .eq('user_id', userId); // RLS handles this but explicit for safety

// Delete
const { data, error } = await supabase
  .from('inventory')
  .delete()
  .eq('id', itemId)
  .eq('user_id', userId);
```

#### 2. Recipe Operations
**Files to modify:**
- `web/app/recipes/page.tsx`
- `web/app/recipe/page.tsx`
- `web/app/cook/[recipeId]/CookContent.tsx`

**Migration tasks:**
- Replace Firestore subcollection pattern (`recipes/{userId}/items`) with RLS-protected table
- Update recipe creation to use `supabase.from('recipes').insert()`
- Update recipe fetching with filters (favorites, search, etc.)
- Migrate real-time listeners from `onSnapshot` to Supabase realtime

**Realtime migration:**
```typescript
// Old Firestore
const unsubscribe = onSnapshot(
  collection(db, 'recipes', userId, 'items'),
  (snapshot) => {
    const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setRecipes(recipes);
  }
);

// New Supabase
const channel = supabase
  .channel('recipes_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'recipes',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // Handle INSERT, UPDATE, DELETE events
      if (payload.eventType === 'INSERT') {
        setRecipes(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setRecipes(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
      } else if (payload.eventType === 'DELETE') {
        setRecipes(prev => prev.filter(r => r.id !== payload.old.id));
      }
    }
  )
  .subscribe();

return () => { channel.unsubscribe(); };
```

#### 3. Meal Plan Operations
**Files to modify:**
- `web/app/meal-plans/page.tsx`

**Migration tasks:**
- Convert meal plan creation/updates to Supabase
- Handle date range queries
- Update meal plan to recipe associations

#### 4. Grocery List Operations
**Files to modify:**
- `web/app/grocery-lists/page.tsx`

**Migration tasks:**
- Migrate grocery list CRUD operations
- Update item check/uncheck functionality
- Handle meal plan relationships

#### 5. Chat History Operations
**Files to modify:**
- `web/app/chat/page.tsx`

**Migration tasks:**
- Migrate chat message storage
- Implement message history loading with pagination
- Consider realtime updates for chat interface

#### 6. Shared Recipes
**Files to modify:**
- `web/app/transfer/[token]/TransferContent.tsx` (if related)
- Any recipe sharing components

**Migration tasks:**
- Update share token generation and lookup
- Handle recipe access via share links

#### 7. Settings & Preferences
**Files to modify:**
- `web/app/settings/page.tsx`
- `web/app/preferences/page.tsx`

**Migration tasks:**
- Update user profile updates
- Migrate dietary preferences storage
- Handle data consent updates

### Mobile Application Changes

#### 1. Inventory Operations
**Files to modify:**
- `mobile/src/screens/main/InventoryScreen.tsx`
- `mobile/src/utils/api.ts` (if used)

#### 2. Recipe Operations
**Files to modify:**
- `mobile/src/screens/main/RecipesScreen.tsx`
- `mobile/src/screens/main/RecipeDetailScreen.tsx`

#### 3. Meal Plans Operations
**Files to modify:**
- `mobile/src/screens/main/MealPlansScreen.tsx`

#### 4. Grocery Lists Operations
**Files to modify:**
- `mobile/src/screens/main/GroceryListScreen.tsx`

#### 5. Chat Operations
**Files to modify:**
- `mobile/src/screens/main/ChatScreen.tsx`

#### 6. Home Screen
**Files to modify:**
- `mobile/src/screens/main/HomeScreen.tsx`

### Shared Utilities

Create shared database utilities to avoid code duplication:

**Create `web/lib/db.ts`:**
```typescript
import { supabase } from './supabase';

export async function getInventory(userId: string) {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function addInventoryItem(userId: string, item: Partial<InventoryItem>) {
  const { data, error } = await supabase
    .from('inventory')
    .insert({ user_id: userId, ...item })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ... more utility functions
```

**Create `mobile/src/utils/database.ts`:**
```typescript
import { supabase } from '../config/supabase';

// Similar structure to web/lib/db.ts but for mobile
```

## Implementation Steps

1. **Phase 1: Create Database Utilities**
   - Create `web/lib/db.ts` with typed utility functions
   - Create `mobile/src/utils/database.ts` with same functions
   - Add TypeScript interfaces for all data types

2. **Phase 2: Migrate Web Inventory**
   - Update inventory page to use new utilities
   - Test CRUD operations
   - Verify RLS policies work correctly

3. **Phase 3: Migrate Web Recipes**
   - Update all recipe-related pages
   - Migrate realtime listeners
   - Test recipe creation, editing, deletion

4. **Phase 4: Migrate Web Meal Plans & Grocery Lists**
   - Update meal planning functionality
   - Update grocery list functionality
   - Test data relationships

5. **Phase 5: Migrate Web Chat & Settings**
   - Update chat interface
   - Migrate settings and preferences
   - Test user profile updates

6. **Phase 6: Migrate Mobile App**
   - Apply same patterns to mobile screens
   - Test all mobile CRUD operations
   - Verify offline handling (if applicable)

7. **Phase 7: Remove Firestore Imports**
   - Remove all Firestore SDK imports
   - Remove old Firebase db references
   - Clean up unused code

## Testing Checklist

- [ ] Web: Create inventory item
- [ ] Web: Update inventory item
- [ ] Web: Delete inventory item
- [ ] Web: View inventory list
- [ ] Web: Create recipe
- [ ] Web: Edit recipe
- [ ] Web: Delete recipe
- [ ] Web: View recipe list
- [ ] Web: Favorite recipe toggle
- [ ] Web: Create meal plan
- [ ] Web: Update meal plan
- [ ] Web: Delete meal plan
- [ ] Web: Create grocery list
- [ ] Web: Check/uncheck grocery items
- [ ] Web: Chat message send/receive
- [ ] Web: Update user settings
- [ ] Mobile: All above operations on mobile
- [ ] Verify RLS prevents cross-user access
- [ ] Test realtime subscriptions

## Potential Issues & Solutions

1. **Timestamp Format Differences**
   - Firestore: `{ seconds, nanoseconds }` or Timestamp objects
   - Postgres: ISO 8601 strings
   - Solution: Convert dates consistently, use `new Date().toISOString()`

2. **ID Generation**
   - Firestore: Auto-generated document IDs
   - Postgres: UUID v4 auto-generated via `uuid_generate_v4()`
   - Solution: Let database handle ID generation

3. **Nested Data**
   - Firestore: Supports nested objects
   - Postgres: Use JSONB columns
   - Solution: Already implemented in migrations (e.g., `ingredients jsonb`, `meals jsonb`)

4. **Realtime Subscriptions**
   - Firestore: `onSnapshot()` per collection
   - Supabase: Channel-based subscriptions
   - Solution: Set up channels properly, handle all event types

5. **Batch Operations**
   - Firestore: `batch.set()`, `batch.update()`
   - Postgres: Use array inserts or transactions
   - Solution: Use Supabase batch insert for multiple items

## Files Summary

**New files:**
- `web/lib/db.ts` - Database utility functions for web
- `mobile/src/utils/database.ts` - Database utility functions for mobile

**Modified files (Web):**
- `web/app/inventory/page.tsx`
- `web/app/recipes/page.tsx`
- `web/app/recipe/page.tsx`
- `web/app/cook/[recipeId]/CookContent.tsx`
- `web/app/meal-plans/page.tsx`
- `web/app/grocery-lists/page.tsx`
- `web/app/chat/page.tsx`
- `web/app/settings/page.tsx`
- `web/app/preferences/page.tsx`
- `web/app/dashboard/page.tsx`
- `web/app/upload/page.tsx`
- `web/app/export-dataset/page.tsx`
- `web/app/labeling/page.tsx`
- `web/app/transfer/[token]/TransferContent.tsx`

**Modified files (Mobile):**
- `mobile/src/screens/main/InventoryScreen.tsx`
- `mobile/src/screens/main/RecipesScreen.tsx`
- `mobile/src/screens/main/RecipeDetailScreen.tsx`
- `mobile/src/screens/main/MealPlansScreen.tsx`
- `mobile/src/screens/main/GroceryListScreen.tsx`
- `mobile/src/screens/main/ChatScreen.tsx`
- `mobile/src/screens/main/HomeScreen.tsx`
- `mobile/src/screens/main/LabelingScreen.tsx`
- `mobile/src/utils/api.ts`

## Estimated Complexity
- **Lines of code changed:** ~2,500-3,000
- **Files modified:** ~25
- **Estimated time:** 6-8 hours
- **Risk level:** Medium (extensive changes but well-defined patterns)
