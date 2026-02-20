# PR Plan: Cloud Functions Migration (Firebase Functions → Edge Functions/Vercel API Routes)

## Overview
Migrate Firebase Cloud Functions to a combination of Supabase Edge Functions (for database-close logic) and Vercel API Routes (for web-integrated endpoints). The Stripe webhook has already been migrated, so this PR focuses on AI/business logic functions.

## Architecture Decision

### Vercel API Routes (Recommended)
**Use for:** All functions since they need OpenAI API access and are primarily called from web app

**Advantages:**
- Easy integration with Next.js web app
- Same deployment pipeline as web app
- No additional infrastructure
- Better TypeScript integration
- Environment variables already configured in Vercel

**Disadvantages:**
- Not as close to database as Edge Functions
- Cold start times (mitigated by Vercel's edge network)

### Supabase Edge Functions (Alternative)
**Use for:** Database-heavy operations if performance is critical

**Advantages:**
- Runs close to database (lower latency)
- Built-in authentication integration
- Deno runtime (modern JavaScript)

**Disadvantages:**
- Separate deployment pipeline
- Need to configure secrets separately
- Different runtime (Deno vs Node.js)

**Decision: Use Vercel API Routes** for all functions since they integrate better with the existing web architecture.

## Scope

### Functions to Migrate

From `functions/src/index.ts`:

1. **analyzeImage** - Extract ingredients from image using OpenAI Vision
2. **chat** - AI cooking assistant
3. **createRecipe** - Generate recipe from ingredients
4. **createMealPlan** - Generate meal plan
5. **createGroceryList** - Generate shopping list from meal plan
6. **importRecipe** - Import recipe from URL/image/text
7. **getSubstitution** - Get ingredient substitutions
8. **deductInventory** - Deduct ingredients after cooking
9. **scanReceipt** - OCR receipt analysis
10. **createTransferSession** - Data transfer token
11. **uploadLabelingImage** - Upload ML training image
12. **getImageAnnotations** - Get annotation data
13. **saveAnnotation** - Save image annotations
14. **triggerSegmentation** - ML segmentation
15. **exportDataset** - Export ML dataset

### Migration Pattern

**Firebase Cloud Function (onCall):**
```typescript
export const analyzeImage = onCall(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY'],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { imageUrl } = request.data;
    const userId = request.auth.uid;
    
    // Business logic...
    const ingredients = await extractIngredientsFromImage(imageUrl);
    
    return { success: true, ingredients };
  }
);
```

**Vercel API Route:**
```typescript
// web/app/api/ai/analyze-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // Get auth token from request
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Verify user with Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  );
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get request data
  const { imageUrl } = await request.json();
  
  // Business logic...
  const ingredients = await extractIngredientsFromImage(imageUrl);
  
  return NextResponse.json({ success: true, ingredients });
}
```

## Implementation Plan

### Phase 1: Set Up API Routes Structure

Create organized API route structure:
```
web/app/api/
├── ai/
│   ├── analyze-image/route.ts
│   ├── chat/route.ts
│   ├── create-recipe/route.ts
│   ├── create-meal-plan/route.ts
│   ├── create-grocery-list/route.ts
│   ├── import-recipe/route.ts
│   ├── get-substitution/route.ts
│   └── scan-receipt/route.ts
├── inventory/
│   └── deduct/route.ts
├── transfer/
│   └── create-session/route.ts
├── labeling/
│   ├── upload/route.ts
│   ├── annotations/route.ts
│   ├── save-annotation/route.ts
│   ├── segment/route.ts
│   └── export/route.ts
└── stripe/ (already migrated)
    ├── webhook/route.ts
    └── portal/route.ts
```

### Phase 2: Create Shared Middleware

**Create `web/lib/middleware.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  );
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  
  return { user, supabase };
}

export async function checkRateLimit(userId: string, endpoint: string, limit: number, windowMs: number) {
  // Implement rate limiting logic using Supabase or Redis
  // For now, simplified version
  return { allowed: true };
}

export async function checkSubscriptionTier(userId: string, requiredTier: 'basic' | 'pro') {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .single();
  
  if (!user) return false;
  
  if (requiredTier === 'pro') {
    return (user.subscription_tier === 'pro' || user.subscription_tier === 'plus' || user.subscription_tier === 'premium') &&
           (user.subscription_status === 'active' || user.subscription_status === 'trialing');
  }
  
  return true;
}
```

### Phase 3: Migrate Service Functions

**Copy and adapt service functions from `functions/src/services/`:**

1. **Create `web/lib/services/ai.ts`:**
   - Copy AI service functions from `functions/src/services/ai.ts`
   - Adapt to use environment variables from Next.js
   - Keep OpenAI API integration

2. **Create `web/lib/services/segmentation.ts`:**
   - Copy segmentation logic
   - Adapt for Vercel environment

### Phase 4: Migrate Individual Functions

#### 1. Analyze Image
**Create `web/app/api/ai/analyze-image/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkRateLimit } from '@/lib/middleware';
import { extractIngredientsFromImage } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user } = auth;
  
  // Rate limiting
  const rateCheck = await checkRateLimit(user.id, 'analyze-image', 100, 60000);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  const { imageUrl } = await request.json();
  
  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
  }
  
  try {
    const ingredients = await extractIngredientsFromImage(imageUrl);
    return NextResponse.json({ success: true, ingredients });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
```

#### 2. Chat
**Create `web/app/api/ai/chat/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkSubscriptionTier } from '@/lib/middleware';
import { chatAssistant } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user } = auth;
  
  // Check subscription (Pro tier only)
  const hasAccess = await checkSubscriptionTier(user.id, 'pro');
  if (!hasAccess) {
    return NextResponse.json({ 
      error: 'AI chat is available on Pro tier. Upgrade to unlock.' 
    }, { status: 403 });
  }
  
  const { messages, context } = await request.json();
  
  try {
    const response = await chatAssistant(messages, context);
    return NextResponse.json({ success: true, message: response });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}
```

#### 3. Create Recipe
**Create `web/app/api/ai/create-recipe/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { generateRecipe } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user, supabase } = auth;
  
  const { ingredients, preferences } = await request.json();
  
  try {
    const recipe = await generateRecipe(ingredients, preferences);
    
    // Optionally save to database
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        is_ai_generated: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, recipe: data });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
```

### Phase 5: Update Client Code

Update all client-side code to call new API routes instead of Firebase functions.

**Old Firebase pattern:**
```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const analyzeImage = httpsCallable(functions, 'analyzeImage');
const result = await analyzeImage({ imageUrl });
```

**New Vercel API pattern:**
```typescript
import { supabase } from '@/lib/supabase';

const { data: { session } } = await supabase.auth.getSession();

const response = await fetch('/api/ai/analyze-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  },
  body: JSON.stringify({ imageUrl }),
});

const result = await response.json();
```

**Create helper function in `web/lib/api.ts`:**
```typescript
import { supabase } from './supabase';

export async function callApi(endpoint: string, data: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  
  return response.json();
}

// Usage:
// const result = await callApi('/ai/analyze-image', { imageUrl });
```

### Phase 6: Mobile API Client

**Create `mobile/src/utils/api.ts`:**
```typescript
import { supabase } from '../config/supabase';

const API_BASE = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:3000';

export async function callApi(endpoint: string, data: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(`${API_BASE}/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }
  
  return response.json();
}
```

## Implementation Steps

1. **Phase 1: Infrastructure**
   - Create API route directories
   - Set up middleware functions
   - Create API client helpers

2. **Phase 2: Core AI Functions**
   - Migrate analyzeImage
   - Migrate createRecipe
   - Migrate createMealPlan
   - Migrate createGroceryList
   - Test each function

3. **Phase 3: Chat & Advanced Features**
   - Migrate chat function
   - Migrate importRecipe
   - Migrate getSubstitution
   - Test Pro tier gating

4. **Phase 4: Inventory & Transfer**
   - Migrate deductInventory
   - Migrate scanReceipt
   - Migrate createTransferSession

5. **Phase 5: ML Labeling Functions**
   - Migrate uploadLabelingImage
   - Migrate getImageAnnotations
   - Migrate saveAnnotation
   - Migrate triggerSegmentation
   - Migrate exportDataset

6. **Phase 6: Client Updates**
   - Update web components to use new API
   - Update mobile components to use new API
   - Test all integrations

7. **Phase 7: Clean Up**
   - Remove Firebase Functions imports
   - Remove old function calls
   - Clean up unused code

## Testing Checklist

- [ ] Web: Analyze image
- [ ] Web: Create recipe
- [ ] Web: Create meal plan
- [ ] Web: Create grocery list
- [ ] Web: Chat (Pro tier only)
- [ ] Web: Import recipe
- [ ] Web: Get substitution
- [ ] Web: Deduct inventory
- [ ] Web: Scan receipt
- [ ] Web: ML labeling operations
- [ ] Mobile: All above operations
- [ ] Rate limiting works
- [ ] Subscription tier checks work
- [ ] Error handling works
- [ ] Authentication required
- [ ] API performance acceptable

## Files Summary

**New files:**
- `web/lib/middleware.ts` - Auth & rate limiting middleware
- `web/lib/api.ts` - API client helper for web
- `web/lib/services/ai.ts` - AI service functions
- `web/lib/services/segmentation.ts` - ML segmentation
- `web/app/api/ai/analyze-image/route.ts`
- `web/app/api/ai/chat/route.ts`
- `web/app/api/ai/create-recipe/route.ts`
- `web/app/api/ai/create-meal-plan/route.ts`
- `web/app/api/ai/create-grocery-list/route.ts`
- `web/app/api/ai/import-recipe/route.ts`
- `web/app/api/ai/get-substitution/route.ts`
- `web/app/api/ai/scan-receipt/route.ts`
- `web/app/api/inventory/deduct/route.ts`
- `web/app/api/transfer/create-session/route.ts`
- `web/app/api/labeling/upload/route.ts`
- `web/app/api/labeling/annotations/route.ts`
- `web/app/api/labeling/save-annotation/route.ts`
- `web/app/api/labeling/segment/route.ts`
- `web/app/api/labeling/export/route.ts`
- `mobile/src/utils/api.ts` - API client for mobile

**Modified files:**
- All web pages calling Cloud Functions
- All mobile screens calling Cloud Functions

## Estimated Complexity
- **Lines of code changed:** ~3,000-4,000
- **Files modified:** ~35
- **Files created:** ~20
- **Estimated time:** 8-10 hours
- **Risk level:** Medium-High (many functions, need thorough testing)
