# SAVR Feature Integration Plan

## Overview
Integration of 10 features to connect inventory, recipes, meal plans, AI chat, and nutritional tracking into a cohesive system.

## Feature List
1. Mobile scanning UX improvements (multi-image, quick-launch, category assignment)
2. Quick inventory adjustments (+/- buttons, log usage)
3. QR code photo transfer from phone to desktop
4. "I Made This" inventory deduction from recipes
5. Cook with Assistant (recipe-aware chat with cooking mode)
6. External recipe import (URL, photo, PDF)
7. Ingredient substitution with inventory awareness
8. Receipt scanning for bulk inventory addition
9. Nutritional tracking on meal plans (MAJOR)
10. Integrated cooking timers in recipe/cooking mode

## Implementation Phases

### Phase 1: Core Data Model & Backend Extensions
**Files modified:** `functions/src/types/index.ts`, `web/types/index.ts`, `functions/src/services/ai.ts`, `functions/src/index.ts`

- Add nutritional data types (NutritionalInfo: calories, protein, carbs, fat, fiber, sugar, sodium)
- Add recipe import types (ImportRecipeRequest with url/imageUrl/pdfUrl fields)
- Add substitution types (SubstitutionRequest/Response)
- Add receipt extraction types
- Add cooking session types
- New Cloud Functions: `importRecipe`, `getSubstitution`, `extractRecipeFromImage`, `extractFromReceipt`, `deductInventory`
- Extend `generateRecipe` and `generateMealPlan` prompts to always return nutritional data
- Extend `chatAssistant` to accept recipe context and inventory context

### Phase 2: Nutritional Tracking (Feature 9 — PRIORITY)
**Files modified:** `functions/src/services/ai.ts`, `web/app/recipes/page.tsx`, `web/app/meal-plans/page.tsx`, `web/app/dashboard/page.tsx`

- Modify recipe generation AI prompt to include per-recipe and per-ingredient nutritional estimates
- Modify meal plan generation to include daily/weekly nutritional summaries
- Add NutritionalSummary component showing calories, macros, and dietary compliance
- Add daily targets based on user preferences (dietary goals)
- Dashboard widget showing nutritional overview of current meal plan
- Visual indicators when meals exceed or fall short of dietary targets

### Phase 3: Inventory Integration (Features 2 & 4)
**Files modified:** `web/app/inventory/page.tsx`, `web/app/recipes/page.tsx`, new `web/components/DeductionModal.tsx`

- Add +/- stepper buttons on inventory cards
- Add "I Made This" button to recipe detail modal
- Build DeductionModal: shows recipe ingredients mapped to inventory, editable quantities, servings multiplier
- Cloud Function `deductInventory`: batch updates inventory quantities, handles unit conversion
- Items reaching 0 prompt: "Remove or add to grocery list?"

### Phase 4: Recipe-Aware Chat & Cooking Mode (Features 5 & 10)
**Files modified:** `web/app/chat/page.tsx`, new `web/app/cook/[recipeId]/page.tsx`, `web/components/CookingTimer.tsx`

- "Cook with Assistant" button on recipe cards opens `/cook/[recipeId]`
- Split-screen cooking view: steps (left/top) + chat (right/bottom)
- Chat pre-loaded with recipe context and current inventory
- Step-by-step mode with large text, prev/next navigation
- Integrated timers: parse time references from instructions, embedded countdown timers
- "I Made This" auto-prompt when reaching final step

### Phase 5: Ingredient Substitution (Feature 7)
**Files modified:** `functions/src/services/ai.ts`, `functions/src/index.ts`, recipe detail + cooking mode UI

- New Cloud Function `getSubstitution`: takes ingredient, recipe context, user inventory
- Returns ranked substitutions prioritizing items user has on hand
- Each substitution includes converted quantities and impact notes
- "Substitute" button per ingredient in recipe detail and cooking mode
- "Apply" action updates the recipe view for the current session

### Phase 6: Recipe Import (Feature 6)
**Files modified:** `web/app/recipes/page.tsx`, `functions/src/services/ai.ts`, `functions/src/index.ts`

- "Import Recipe" button on recipes page with 3 input tabs: URL, Photo, PDF
- URL import: Cloud Function fetches page, extracts schema.org/Recipe JSON-LD, falls back to AI extraction
- Photo import: reuses Vision pipeline with recipe-extraction prompt
- PDF import: text extraction + AI structuring
- Review screen for user to verify/edit before saving
- Imported recipes tagged `generatedBy: 'import'`

### Phase 7: Mobile Scanning & Receipt Scanning (Features 1 & 8)
**Files modified:** `web/app/upload/page.tsx`, `web/components/ImageUpload.tsx`, `web/app/dashboard/page.tsx`

- Multi-image upload support (batch analyze)
- Auto-camera launch via URL param from dashboard quick action
- Category assignment (pantry/fridge/freezer) per detected item before saving
- Duplicate detection against existing inventory
- Receipt scanning mode: separate AI prompt optimized for receipt OCR
- Receipt results include item names, quantities, and optionally prices

### Phase 8: QR Code Photo Transfer (Feature 3)
**Files modified:** new `web/app/transfer/[token]/page.tsx`, `web/app/upload/page.tsx`

- "Transfer from Phone" button on upload page generates session token
- QR code displayed on desktop using qrcode library
- `/transfer/[token]` is a lightweight public page (no auth) for photo upload
- Firestore listener on desktop detects uploaded images
- Auto-feeds images to analyzeImage pipeline
- Tokens expire after 15 minutes, single-use
