# SAVR User Flow Review & Recommendations

Review of 7 user flow scenarios against the current codebase, with gap analysis, improvement suggestions, and additional flow ideas.

---

## Scenario 1: Mobile User Opens App to Scan Pantry

**User story:** A mobile user opens the app in their browser and wants to scan their pantry to gather inventory.

### Current State
- The `/upload` page has a dedicated **"Take Photo with Camera"** button that triggers `<input capture="environment">` (`ImageUpload.tsx:59-69`)
- There is also a drag-and-drop / file picker for choosing from gallery
- After upload, the image is sent to the `analyzeImage` Cloud Function which uses OpenAI Vision (primary) with Google Cloud Vision fallback
- Detected ingredients are shown for review, then bulk-saved to inventory

### Gaps & Improvements

| Issue | Recommendation |
|-------|---------------|
| **No quick-access camera shortcut from dashboard.** The user must navigate Dashboard > Upload. On mobile this is two taps plus a page load. | Add a floating action button (FAB) or prominent "Scan Pantry" CTA on the dashboard that links directly to `/upload` with auto-open camera intent. Consider a `?autoCamera=true` query param that triggers `cameraInputRef.current?.click()` on mount. |
| **Single image at a time.** Users with large pantries need to upload one photo, wait for analysis, then do another. | Support **multi-image upload** — let users take/select multiple photos in one session and batch-analyze them before a single bulk save. The `<input>` already supports `multiple` attribute; the backend `analyzeImage` function could be called in parallel per image. |
| **No guidance on what was already scanned.** If a user scans shelf by shelf, they can't tell what's already been captured vs. what's new. | Show a running summary sidebar/footer of "Items detected so far this session" that persists across multiple uploads within the same visit. |
| **All items default to `category: 'pantry'`.** (`upload/page.tsx:88`) | After AI detection, let the user assign categories (pantry/fridge/freezer) per item or in bulk before saving. The AI prompt could also be enhanced to infer storage location (e.g., milk = fridge). |
| **No duplicate detection.** If a user scans the same shelf twice, they'll get duplicate inventory entries. | Before saving, cross-reference detected items against existing inventory. Show a warning like "Milk already in inventory (2L) — merge or skip?" |
| **PWA install not prominently surfaced.** The `PwaRegister.tsx` component exists but mobile users may not know they can add the app to their home screen for faster access. | Show a one-time "Add to Home Screen" prompt banner on mobile after first successful scan, giving it an app-like launch experience. |

### Mobile-Specific Feasibility
- Camera access via `capture="environment"` is well-supported on iOS Safari and Android Chrome
- The current implementation works on mobile browsers — this is confirmed by the responsive layout patterns used throughout
- **Verdict: Functional, but the UX can be streamlined significantly for a mobile-first scanning workflow.**

---

## Scenario 2: Browser User Updates Inventory After Consuming Items Outside of Recipes

**User story:** A user (on any device) ate something that wasn't from a generated recipe and needs to manually reduce inventory quantities.

### Current State
- The `/inventory` page supports editing any item via the Edit modal (`inventory/page.tsx:386-475`)
- Users can change name, quantity, unit, category, and expiry date
- Deletion is also available per item

### Gaps & Improvements

| Issue | Recommendation |
|-------|---------------|
| **No "quick decrement" UI.** To reduce quantity, the user must: tap Edit > change the number > tap Save. That's 3 actions for a very common task. | Add **+/- stepper buttons** directly on each inventory card. One tap to decrement by 1 (or by the item's standard unit). Long-press or shift-click for custom amounts. |
| **No "I used this" flow.** The app has no concept of consumption outside recipes. | Add a **"Log Usage"** button on inventory items that opens a quick modal: "How much did you use?" with a quantity field. This could also feed into analytics (e.g., "You typically use 3 eggs per week"). |
| **No batch editing.** If a user had a dinner party and consumed 10 items, they need to edit each one individually. | Support **multi-select mode** on the inventory page — checkbox each item, then "Adjust selected" to reduce quantities or remove items in bulk. |
| **No undo.** Accidentally setting quantity to 0 means the item is effectively gone (or needs manual re-entry). | Add **undo/confirmation** for destructive quantity changes. A toast with "Undo" link for 5 seconds after saving. |
| **Inventory is not real-time synced.** `loadInventory()` uses `getDocs` (one-time fetch) rather than `onSnapshot`. | Switch to Firestore `onSnapshot` listener for real-time updates across devices/tabs. If the user updates from their phone and has the desktop open, both should reflect changes immediately. |

### Mobile + Desktop Feasibility
- Edit modal already uses responsive styles (`max-w-md w-full`)
- Stepper buttons would be touch-friendly and work on desktop
- **Verdict: The CRUD exists but the workflow is too heavy for the most common operation (reducing a quantity). Quick-adjust controls are essential.**

---

## Scenario 3: Desktop User Transfers Photos from Non-SAVR Mobile Device via QR Code

**User story:** A user has pantry photos on their personal phone (which doesn't have the SAVR app) and wants to transfer them to their desktop browser session.

### Current State
- The `html5-qrcode` library (v2.3.8) is installed as a dependency but **not actively used** anywhere in the UI
- There is no QR code generation or scanning feature implemented
- Image upload only works via the local file system of the device running the browser

### Gaps & Improvements

| Issue | Recommendation |
|-------|---------------|
| **Feature doesn't exist yet.** There is no QR-based photo transfer flow. | This is a novel and valuable feature. Here's a proposed implementation: |

#### Proposed QR Transfer Flow

1. **Desktop side (`/upload` page):**
   - Add a "Transfer from Phone" button
   - When clicked, the app generates a unique short-lived session token and stores it in Firestore (e.g., `transferSessions/{token}`)
   - Display a QR code encoding a URL like `https://savr.app/transfer/{token}`
   - Desktop enters a polling/listener state watching the Firestore doc for uploaded images

2. **Phone side (no app needed):**
   - User scans QR code with their phone's native camera
   - Opens a lightweight web page at `/transfer/{token}` — **no login required**
   - Page shows a simple multi-image upload form
   - Images upload to Firebase Storage under the transfer session path
   - Firestore doc is updated with image URLs

3. **Desktop side (completion):**
   - Real-time listener detects new images
   - Automatically feeds them to `analyzeImage` for AI detection
   - User reviews and saves to inventory as normal

4. **Security considerations:**
   - Transfer tokens should expire after 10-15 minutes
   - Rate limit: max 20 images per session
   - Token is single-use (invalidated after first successful transfer)
   - No auth required on phone side (the desktop user is already authenticated)

#### Alternative Approaches

| Approach | Pros | Cons |
|----------|------|------|
| **QR code transfer (recommended)** | No app needed on phone, works with any device, seamless UX | Requires new backend endpoint, security considerations |
| **Email-to-SAVR** | Very simple for users | Slow, requires email parsing service |
| **Cloud sync (Google Photos/iCloud link)** | Leverages existing photo libraries | Complex OAuth, platform-specific |
| **WebRTC peer transfer** | Direct device-to-device, fast | Complex implementation, firewall issues |

### Feasibility
- `html5-qrcode` is already installed for scanning; QR *generation* can use a lightweight library like `qrcode` (npm) or server-side generation
- Firebase Storage + Firestore make the temporary session approach straightforward
- The transfer page would be a new public route (`/transfer/[token]`) with minimal UI
- **Verdict: Highly achievable with the current tech stack. The QR transfer approach is the most user-friendly option and aligns with the existing architecture.**

---

## Scenario 4: Pro User Deducts Ingredients After Cooking a SAVR Recipe

**User story:** A pro user cooked a recipe suggested by the app and wants the ingredient quantities removed from inventory. One ingredient was used in a different amount than the recipe specified.

### Current State
- Recipes store ingredients with quantities (`RecipeIngredient: { name, quantity, unit }`)
- Inventory items store quantities independently
- **There is no "I cooked this" or inventory deduction feature.** The recipe and inventory systems are not linked for consumption tracking.

### Gaps & Improvements

| Issue | Recommendation |
|-------|---------------|
| **No "Mark as Cooked" feature.** After cooking, the user has to manually edit each inventory item. For a recipe with 8 ingredients, that's 8 edit cycles. | Add a **"I Made This"** button on the recipe detail modal. When tapped, it shows the recipe's ingredient list with pre-filled quantities and a checkbox per ingredient. |
| **No quantity adjustment before deduction.** The user used a different amount of one ingredient. | The "I Made This" flow should allow **inline quantity editing** per ingredient before confirming. Pre-fill with recipe quantities, but let the user adjust (e.g., "Used 200g chicken instead of 250g"). |
| **No unit conversion.** Recipe says "2 cups flour" but inventory has "500g flour". | Implement unit conversion logic. The backend already has `functions/src/utils/units.ts` — this should be leveraged client-side to normalize quantities before deduction. |
| **No partial cooking support.** User made half the recipe. | Add a **servings multiplier** in the "I Made This" flow. "Recipe is for 4 servings, I made 2" — auto-halves all quantities. |
| **No inventory matching.** "Chicken breast" in recipe vs. "chicken" in inventory won't auto-match. | Use fuzzy matching (e.g., Levenshtein distance or AI-assisted matching) to map recipe ingredients to inventory items. Show the mapping for user confirmation before deduction. |

#### Proposed "I Made This" Flow

```
[Recipe Detail Modal]
    |
    v
[Click "I Made This"]
    |
    v
[Deduction Review Screen]
  - Lists each recipe ingredient
  - Shows matched inventory item (with confidence indicator)
  - Pre-filled quantity (editable)
  - Servings multiplier (default: recipe servings)
  - Checkbox to skip ingredients not from inventory
    |
    v
[Confirm Deduction]
  - Batch updates inventory quantities
  - Items reaching 0 are flagged: "Remove from inventory?" or "Add to grocery list?"
  - Success toast with undo option
```

### Feasibility
- Requires a new UI component (deduction review) and a batch Firestore update
- `units.ts` already handles some conversion logic
- Ingredient matching is the trickiest part — a simple normalized string comparison would handle 80% of cases; AI matching for the rest
- **Verdict: Essential feature for the app's core value prop. Without this, users are manually tracking what they already told the app about.**

---

## Scenario 5: Pro User Cooks a Saved Recipe Using AI Assistant

**User story:** A pro user has a saved recipe from a previous session and wants to cook it now, using the AI chat as a real-time cooking coach.

### Current State
- Saved recipes are viewable in `/recipes` with full ingredients and step-by-step instructions
- AI chat (`/chat`) is a general-purpose cooking assistant with conversation history
- **The chat has no awareness of the user's recipes or inventory.** It's a standalone conversation interface.

### Gaps & Improvements

| Issue | Recommendation |
|-------|---------------|
| **Chat doesn't know what recipe the user is cooking.** The user has to manually describe it or paste instructions. | Add a **"Cook with Assistant"** button on each recipe card/detail modal. This opens the chat with the recipe pre-loaded as context (system message or initial user message). |
| **No step-by-step guided mode.** The instructions are a static list. | Implement a **"Cooking Mode"** view: full-screen, one step at a time, large text (for reading while cooking), with "Next Step" / "Previous Step" buttons. Timer integration for steps with time references. |
| **Chat doesn't know the user's inventory.** Can't proactively warn about missing ingredients. | Before starting a cook session, cross-reference recipe ingredients with inventory. Show "You have everything" or "Missing: X, Y, Z — need substitutions?" |
| **No hands-free interaction.** Users' hands are messy while cooking. | Consider **voice input** for the chat (Web Speech API is free and supported in modern browsers). "Hey, what temperature should I set the oven to?" |
| **Chat history is one flat conversation.** Sessions about different recipes get mixed together. | Support **chat threads/sessions** tied to specific recipes. When entering "Cook with Assistant" mode, create a new thread scoped to that recipe. |

#### Proposed "Cook with Assistant" Flow

```
[Recipe Card] → "Cook with Assistant" button
    |
    v
[Pre-cook Check]
  - Verify ingredients against inventory
  - Highlight missing items
  - Offer substitution suggestions
    |
    v
[Split-screen Cooking View]
  - Left/Top: Recipe steps (one at a time or scrollable)
  - Right/Bottom: AI chat (pre-loaded with recipe context)
  - Built-in timers
  - "I Made This" auto-prompt when last step is reached
```

### Mobile vs Desktop
- On desktop: side-by-side layout (recipe steps + chat)
- On mobile: tab-based view (swipe between Steps and Chat) or a collapsible chat panel at the bottom
- Voice input works on both platforms
- **Verdict: This is where the Pro tier really justifies its price. Connecting the AI assistant to recipe context transforms it from a generic chatbot to a personalized cooking coach.**

---

## Scenario 6: Pro User Imports an External Recipe (URL, Photo, PDF) and Cooks with Assistant

**User story:** A user found a recipe on another website, in a photo, or in a PDF and wants to import it into SAVR, then cook with the AI assistant guiding them.

### Current State
- **No recipe import feature exists.** Recipes can only be AI-generated from inventory.
- The image analysis pipeline exists for *ingredient* extraction but not for *recipe* extraction
- No URL scraping or PDF parsing capabilities

### Gaps & Improvements

| Issue | Recommendation |
|-------|---------------|
| **No recipe import from URL.** | Add a **"Import Recipe"** option on the recipes page with a URL input field. Use a Cloud Function that fetches the page, extracts recipe structured data (JSON-LD `schema.org/Recipe` is standard on most recipe sites), and parses it into SAVR's recipe format. |
| **No recipe import from photo.** | Extend the existing Vision AI pipeline. Create a new Cloud Function `extractRecipeFromImage` that uses OpenAI Vision to read a recipe from a photo/screenshot and return structured data (title, ingredients, instructions). |
| **No recipe import from PDF.** | Add PDF upload support on the import page. Use a Cloud Function that extracts text from the PDF (e.g., `pdf-parse` npm library) and feeds it to OpenAI to structure into recipe format. |
| **Imported recipes aren't linked to inventory.** | After import, automatically cross-reference recipe ingredients with inventory. Highlight what the user has vs. what they need. |
| **No cooking assistant integration for imported recipes.** | Imported recipes should behave identically to generated ones — including the "Cook with Assistant" flow from Scenario 5. |

#### Proposed Import Flows

**URL Import:**
```
[Recipes Page] → "Import Recipe" → "From URL"
    |
    v
[Paste URL] → Cloud Function scrapes & parses
    |
    v
[Review imported recipe] → Edit title, ingredients, instructions
    |
    v
[Save to library] → Available for cooking, meal plans, etc.
```

**Photo/PDF Import:**
```
[Recipes Page] → "Import Recipe" → "From Photo" or "From PDF"
    |
    v
[Upload file] → Cloud Function processes with AI
    |
    v
[Review extracted recipe] → User corrects any OCR/AI errors
    |
    v
[Save to library]
```

#### Technical Notes
- URL scraping: Many recipe sites use `schema.org/Recipe` JSON-LD markup. Fallback to OpenAI extraction for non-standard sites.
- Photo: The existing `analyzeImage` Cloud Function pattern can be reused with a different prompt.
- PDF: `pdf-parse` + OpenAI is straightforward. Alternatively, convert PDF pages to images and use Vision API.
- All imported recipes should be tagged `generatedBy: 'import'` to distinguish from AI-generated ones.

### Feasibility
- URL import is the easiest — most recipe sites have structured data
- Photo import leverages existing infrastructure
- PDF import requires a new dependency but is standard
- **Verdict: High value, moderate effort. URL import alone would cover 70%+ of use cases and should be prioritized first.**

---

## Scenario 7: User Needs a Last-Minute Ingredient Substitution

**User story:** A user is mid-cooking and realizes they're out of an ingredient. They need substitution options that account for the specific recipe and adjust amounts.

### Current State
- The AI chat can answer general substitution questions, but the user has to provide all context manually
- **No dedicated substitution feature exists**
- No integration between recipes, inventory, and substitution logic

### Gaps & Improvements

| Issue | Recommendation |
|-------|---------------|
| **No quick substitution action.** User has to open chat, type out the recipe name, ingredient, and context. | Add a **"Substitute"** button next to each ingredient in the recipe detail view. One tap opens a substitution panel/modal. |
| **Substitutions don't consider what's in inventory.** Generic substitutions aren't useful if the user doesn't have the alternative either. | The substitution engine should query the user's current inventory and prioritize alternatives they actually have on hand. |
| **No quantity adjustment.** "Use yogurt instead of buttermilk" — but how much? | Substitution results should include **converted quantities** specific to the recipe amounts. E.g., "Replace 1 cup buttermilk with: 1 cup yogurt thinned with 2 tbsp milk." |
| **No recipe-context awareness.** Substituting butter in baking vs. sauteing requires different alternatives. | Pass the full recipe context (title, cooking method, other ingredients) to the AI when generating substitutions. The AI should consider the role of the ingredient in the dish. |
| **No way to apply the substitution.** After getting a suggestion, the user has to mentally note it. | Add an **"Apply Substitution"** button that updates the recipe's ingredient list in real-time (for the current cooking session, not permanently unless the user saves). |

#### Proposed Substitution Flow

```
[Recipe Detail / Cooking Mode]
    |
    v
[Tap ingredient] → "Need a substitute?"
    |
    v
[Substitution Panel]
  - "You're out of: Buttermilk (1 cup)"
  - "From your inventory, you can use:"
    1. Plain yogurt (1 cup) + milk (2 tbsp) ← YOU HAVE THIS
    2. Milk (1 cup) + lemon juice (1 tbsp) ← YOU HAVE THIS
    3. Sour cream (3/4 cup) + water (1/4 cup) ← NEED SOUR CREAM
  - [Apply #1] [Apply #2] [Ask Assistant for more options]
    |
    v
[Apply] → Updates recipe view for this session
        → Optionally adjusts inventory deduction quantities
```

### Feasibility
- Can be implemented as a specialized Cloud Function call that takes: the missing ingredient, recipe context, and current inventory
- UI is a modal or slide-up panel — standard pattern already used throughout the app
- **Verdict: Extremely practical and differentiating. This is the kind of "in-the-moment" feature that makes an app indispensable during actual cooking.**

---

## Additional User Flows to Consider

### Flow A: Expiry-Based Recipe Suggestions
**Scenario:** Items in the user's inventory are approaching expiry. The app proactively suggests recipes that prioritize using those items first.

- The expiry date field exists on inventory items but isn't used for recipe generation
- Add a "Use It Before You Lose It" section on the dashboard showing items expiring within 3 days
- The recipe generation prompt could be enhanced: "Prioritize these ingredients as they expire soon: [list]"
- **Push notifications** (via PWA) when items are about to expire

### Flow B: Grocery List Auto-Generation from Meal Plan Gaps
**Scenario:** A user generates a meal plan for the week. The app compares required ingredients against current inventory and auto-generates a grocery list for only the missing items.

- The meal plan and grocery list features exist independently
- The `createGroceryList` Cloud Function already accepts `currentInventory` — but the UI flow doesn't clearly connect "plan meals" > "check what's missing" > "generate shopping list"
- Make this a one-click flow from the meal plan page: "Generate Grocery List for This Plan"

### Flow C: Collaborative Household Inventory
**Scenario:** Multiple household members share the same pantry. One person adds items, another cooks and deducts.

- Currently everything is single-user (partitioned by `userId`)
- Add a "Household" concept where multiple user accounts share an inventory
- Invite via email or link, view activity log ("Alex added 2L Milk"), conflict resolution for simultaneous edits

### Flow D: Receipt Scanning for Inventory Addition
**Scenario:** A user comes home from the grocery store and scans their receipt to bulk-add purchased items.

- The image analysis pipeline already extracts text from images (Google Cloud Vision OCR)
- A receipt-specific analysis prompt would extract item names and quantities from grocery receipts
- Automatically adds items and could track purchase prices for budgeting insights

### Flow E: Leftover Tracker
**Scenario:** A user cooked a recipe and has leftovers. They want to track what's in the fridge and get suggestions for how to use leftovers before they go bad.

- After the "I Made This" flow, prompt: "Did you have leftovers?"
- Track leftovers as a special inventory category with a short expiry (2-3 days)
- Dashboard widget: "Use your leftover [Roasted Chicken] — here are 3 ideas"

### Flow F: Nutritional Tracking
**Scenario:** A health-conscious user wants to see the nutritional breakdown of their meal plan for the week.

- Recipes currently don't include nutritional data
- The AI generation prompt could be enhanced to include estimated calories, macros, etc.
- Weekly summary: "This week's meal plan: ~12,000 cal, 40% carbs, 30% protein, 30% fat"

### Flow G: Social / Community Recipes
**Scenario:** A user wants to browse popular recipes from other SAVR users, filtered by what they have in their pantry.

- The `sharedRecipes` collection exists for individual sharing
- Extend this to a public recipe feed with search and filtering
- "Recipes you can make now" — filtered by the user's current inventory
- Star/save community recipes to personal library

### Flow H: Cooking Timer Integration
**Scenario:** A recipe says "bake for 25 minutes." The user wants a timer that's integrated into the cooking flow.

- Currently there are no timers in the app
- Parse time references from recipe instructions (regex or AI)
- Embed countdown timers per step in Cooking Mode
- Browser notification when timer expires (works on both mobile and desktop)

---

## Cross-Cutting Concerns: Mobile vs. Desktop

| Concern | Mobile (Browser) | Desktop (Browser) | Recommendation |
|---------|-------------------|-------------------|----------------|
| **Camera access** | Native via `capture="environment"` — works well | Webcam available but rarely useful for pantry scanning | Camera features should be prominent on mobile, secondary on desktop. Desktop should emphasize file upload and QR transfer. |
| **Navigation density** | Hamburger menu with 9+ items is getting crowded | Desktop nav bar also has 9 items in a row | Consider grouping: "Kitchen" (Upload, Inventory, Recipes) + "Planning" (Meal Plans, Lists) + "Tools" (Chat, Preferences, Settings). Use a bottom tab bar on mobile for primary actions. |
| **Touch targets** | Most buttons use adequate padding | N/A | The edit/delete buttons on inventory cards (`flex-1 px-3 py-1`) are a bit small for mobile. Increase to at least 44x44px touch targets per Apple HIG. |
| **Offline support** | PWA registered but no offline data caching | Less critical | Add offline inventory viewing via Firestore persistence. Users should be able to check their pantry without connectivity. |
| **Screen real estate** | Limited — modals take full screen | Plenty — side panels work better | Use slide-out drawers or side panels on desktop instead of centered modals. On mobile, full-screen modals are appropriate. |
| **Keyboard input** | Tedious | Efficient | On mobile, minimize text input. Use tappable chips, steppers, and toggles instead of free-form fields where possible. |

---

## Priority Ranking

Based on impact (how many users benefit), effort (implementation complexity), and alignment with the app's core value proposition:

| Priority | Feature | Scenarios |
|----------|---------|-----------|
| **P0 — Critical** | "I Made This" inventory deduction | #4 |
| **P0 — Critical** | Quick quantity adjustment (+/- buttons) | #2 |
| **P1 — High** | Recipe import from URL | #6 |
| **P1 — High** | Ingredient substitution with inventory awareness | #7 |
| **P1 — High** | "Cook with Assistant" (recipe-aware chat) | #5 |
| **P1 — High** | Multi-image upload for scanning | #1 |
| **P2 — Medium** | QR code photo transfer | #3 |
| **P2 — Medium** | Cooking mode (step-by-step view) | #5 |
| **P2 — Medium** | Recipe import from photo/PDF | #6 |
| **P2 — Medium** | Expiry-based recipe suggestions | Flow A |
| **P3 — Nice to have** | Voice input for chat | #5 |
| **P3 — Nice to have** | Receipt scanning | Flow D |
| **P3 — Nice to have** | Nutritional tracking | Flow F |
| **P3 — Nice to have** | Collaborative household | Flow C |

---

## Summary

The app's foundation is solid — authentication, inventory CRUD, AI recipe generation, and a chat assistant all work. The biggest gaps are in the **connections between features**:

1. **Recipes don't talk to inventory** — no deduction, no availability checking, no substitution awareness
2. **The AI chat is isolated** — it doesn't know what the user is cooking, what they have, or what they need
3. **Input methods are limited** — single photo upload, no recipe import, no QR transfer
4. **Common operations are too heavy** — adjusting a quantity requires 3 taps through an edit modal

The recommended approach is to focus on tightening the inventory-to-recipe loop first (P0 items), then expand input methods and AI integration (P1), then add convenience features (P2/P3).
