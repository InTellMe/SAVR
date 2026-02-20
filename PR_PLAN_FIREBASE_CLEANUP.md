# PR Plan: Firebase Dependency Removal & Final Cleanup

## ⚠️ Prerequisites Before Running This PR

**DO NOT proceed with Firebase cleanup until:**

1. **Testing Complete** - All migrated functions must be tested and working:
   - ✅ All AI functions tested (analyze-image, chat, create-recipe, etc.)
   - ✅ Inventory deduction tested
   - ✅ Transfer sessions tested
   - ✅ Stripe portal tested
   - ✅ Mobile app tested with new API routes

2. **ML Labeling Functions Implemented** - Currently stubbed functions need full implementation:
   - ⚠️ `uploadLabelingImage` - needs implementation
   - ⚠️ `getImageAnnotations` - needs implementation
   - ⚠️ `saveAnnotation` - needs implementation
   - ⚠️ `triggerSegmentation` - needs implementation
   - ⚠️ `exportDataset` - needs implementation
   - OR these pages (app/labeling, app/export-dataset) must be deprecated/removed

3. **GitHub Actions Updated** (PR #4):
   - ⚠️ Vercel deployment workflow configured
   - ⚠️ Preview deployment workflow created
   - ⚠️ Mobile build workflow updated

## Overview
Remove all Firebase dependencies and configurations after successful migration to Supabase. This is the final cleanup PR that removes Firebase completely from the codebase.

**Current Migration Status:** ~80% complete. Core features migrated, but ML labeling functions and testing remain.

## Scope

### Dependencies to Remove

#### Web (`web/package.json`)
```json
{
  "dependencies": {
    "firebase": "^12.8.0",           // REMOVE
    "firebase-admin": "^13.6.0"      // REMOVE
  }
}
```

#### Mobile (`mobile/package.json`)
```json
{
  "dependencies": {
    "firebase": "^12.8.0"            // REMOVE
  }
}
```

#### Functions (Entire directory)
- Remove `functions/` directory entirely
- No longer needed with Vercel API routes

### Configuration Files to Remove

**Root directory:**
- `firebase.json` - Firebase project configuration
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore indexes
- `storage.rules` - Firebase Storage rules
- `.firebaserc` - Firebase project aliases (if exists)

**Mobile directory:**
- `mobile/google-services.json` - Android Firebase config (if exists)
- `mobile/GoogleService-Info.plist` - iOS Firebase config (if exists)

### Code Files to Remove/Update

#### Web Application

**Files to delete:**
- `web/lib/firebase.ts` - Firebase initialization

**Files to update (remove Firebase imports):**
- `web/app/sign-up/page.tsx`
- `web/app/sign-in/page.tsx`
- Any remaining pages with Firebase imports

#### Mobile Application

**Files to delete:**
- `mobile/src/config/firebase.ts` - Firebase initialization

**Files to update:**
- Remove any remaining Firebase imports from screens

### Documentation to Update

#### Files to Update

**`README.md`:**
- Remove Firebase references
- Update architecture section
- Update tech stack
- Update deployment section
- Update environment variables section

**`QUICKSTART.md`:**
- Remove Firebase setup steps
- Add Supabase setup steps
- Update local development instructions

**`DEPLOYMENT.md`:**
- Remove Firebase deployment instructions
- Add Vercel deployment instructions
- Update mobile deployment with Supabase

**`.env.example`:**
- Already updated (remove deprecated section if still there)

#### Files to Deprecate/Archive

Move these files to a `docs/archive/firebase/` directory:
- `FIREBASE_AUTH_FIX.md`
- `FIREBASE_FUNCTIONS_MIGRATION.md`
- `cloudbuild-android.yaml` (if using GCP Build)

Or simply delete them if not needed for historical reference.

## Implementation Steps

### Phase 1: Verification

Before removing anything, verify:
1. ✅ All CRUD operations use Supabase
2. ✅ All storage operations use Supabase Storage
3. ✅ All Cloud Functions migrated to Vercel API routes (10/15 core functions complete, 5 ML functions stubbed)
4. ✅ Authentication uses Supabase Auth
5. ✅ Stripe webhooks use Vercel API route
6. ⏳ GitHub Actions updated (not yet done)
7. ✅ Web app deployed on Vercel
8. ✅ Mobile app builds with EAS

**Current Status:**
- ✅ Core AI functions migrated (analyze-image, chat, create-recipe, create-meal-plan, create-grocery-list, import-recipe, get-substitution, scan-receipt)
- ✅ Inventory deduction migrated
- ✅ Transfer sessions migrated
- ✅ Stripe portal migrated
- ⚠️ ML labeling functions stubbed (need full implementation before cleanup)
- ✅ All web app pages updated to use new API routes
- ✅ Mobile app API client updated

**Run verification checks:**
```bash
# Search for Firebase imports in web
cd web
grep -r "from 'firebase" --include="*.ts" --include="*.tsx" src/ app/ lib/ contexts/

# Search for Firebase imports in mobile
cd mobile
grep -r "from 'firebase" --include="*.ts" --include="*.tsx" src/

# Search for Firebase function calls
grep -r "httpsCallable" --include="*.ts" --include="*.tsx" .

# Search for Firestore calls
grep -r "collection\|doc\|getDoc\|setDoc\|onSnapshot" --include="*.ts" --include="*.tsx" . | grep firebase
```

If any results found, those need to be migrated first before proceeding.

### Phase 2: Remove Dependencies

1. **Update `web/package.json`:**
   ```bash
   cd web
   npm uninstall firebase firebase-admin
   ```

2. **Update `mobile/package.json`:**
   ```bash
   cd mobile
   npm uninstall firebase
   ```

3. **Verify lock files updated:**
   ```bash
   # Check that firebase is gone
   cd web && npm list firebase
   cd mobile && npm list firebase
   ```

### Phase 3: Remove Configuration Files

```bash
# From repository root
rm firebase.json
rm firestore.rules
rm firestore.indexes.json
rm storage.rules
rm .firebaserc  # if exists

# Remove mobile Firebase configs if they exist
rm mobile/google-services.json
rm mobile/GoogleService-Info.plist
```

### Phase 4: Remove Code Files

```bash
# Remove Firebase initialization files
rm web/lib/firebase.ts
rm mobile/src/config/firebase.ts
```

### Phase 5: Remove Functions Directory

```bash
# Remove entire functions directory
rm -rf functions/
```

**Before deleting, verify:**
- All service functions copied to `web/lib/services/`
- All types copied or recreated
- No unique business logic left behind

### Phase 6: Update Mobile Configuration

**Update `mobile/app.config.ts`:**

Remove any Firebase-related configuration:
```typescript
android: {
  // Remove this line if it exists
  googleServicesFile: './google-services.json',
}
```

### Phase 7: Update Documentation

**Update `README.md`:**

```markdown
# Before (Firebase references):
- **Backend**: Firebase (Auth, Firestore, Functions, Storage, Hosting)
- **Web Deployment**: Firebase Hosting, Cloud Functions, GitHub Actions CI/CD

# After (Supabase references):
- **Backend**: Supabase (Auth, Postgres, Storage, Realtime)
- **Web Deployment**: Vercel, GitHub Actions CI/CD
```

**Update architecture diagram** (if exists) to show:
- Supabase instead of Firebase
- Vercel instead of Firebase Hosting
- Postgres instead of Firestore

**Update tech stack:**
```markdown
## Tech Stack

- **Frontend**: React 19, Next.js 16, TypeScript, Tailwind CSS 4
- **Mobile**: React Native 0.81, Expo 54, TypeScript
- **Backend**: Supabase (Auth, Postgres, Storage, Realtime)
- **Database**: PostgreSQL (via Supabase)
- **AI**: OpenAI GPT-4o, OpenAI Vision, Google Cloud Vision
- **Payments**: Stripe
- **Web Deployment**: Vercel, GitHub Actions CI/CD
- **Mobile Deployment**: EAS Build, Google Play Store, GitHub Actions CI/CD
```

**Update `QUICKSTART.md`:**

Remove Firebase setup sections, replace with:
```markdown
## Prerequisites

- Node.js 20+
- Supabase account
- Vercel account (for deployment)
- Stripe account (for payments)

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/GooseyPrime/SAVR.git
   cd SAVR
   ```

2. **Set up Supabase**
   Follow the instructions in [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

3. **Configure environment variables**
   ```bash
   # Web app
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   
   # Mobile app
   cp mobile/.env.example mobile/.env
   # Edit mobile/.env with your Supabase credentials
   ```

4. **Install dependencies**
   ```bash
   cd web && npm install
   cd ../mobile && npm install
   ```

5. **Run locally**
   ```bash
   # Web
   cd web && npm run dev
   
   # Mobile
   cd mobile && npm start
   ```
```

**Update `DEPLOYMENT.md`:**

Replace Firebase deployment sections with Vercel deployment:
```markdown
## Web Deployment

### Vercel (Production)

1. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Configure build settings:
     - Framework Preset: Next.js
     - Root Directory: web
     - Build Command: npm run build
     - Output Directory: .next

2. **Configure Environment Variables**
   Add all variables from `.env.example` in Vercel dashboard

3. **Deploy**
   - Push to main branch
   - Vercel auto-deploys
   - Or manually deploy: `vercel --prod`

### Database Migrations

Run migrations after deployment:
```bash
supabase db push --project-ref your-ref
```
```

### Phase 8: Archive Old Documentation

**Option 1: Archive**
```bash
mkdir -p docs/archive/firebase
mv FIREBASE_*.md docs/archive/firebase/
mv cloudbuild-android.yaml docs/archive/firebase/
```

**Option 2: Delete**
```bash
rm FIREBASE_*.md
rm cloudbuild-android.yaml
```

### Phase 9: Update .gitignore

Remove Firebase-specific entries (if any):
```gitignore
# Remove these if they exist:
# .firebase/
# firebase-debug.log
# firestore-debug.log
```

Add Vercel entries:
```gitignore
# Vercel
.vercel
```

## Testing After Cleanup

### Build Tests

```bash
# Test web build
cd web
npm run build

# Test mobile TypeScript
cd mobile
npx tsc --noEmit
```

### Deployment Tests

1. Deploy to Vercel preview
2. Test all functionality:
   - Authentication
   - CRUD operations
   - File uploads
   - API routes
   - Stripe webhooks

3. Build mobile app
4. Test mobile functionality

### Verification Checklist

- [ ] Web builds successfully
- [ ] Mobile TypeScript compiles
- [ ] No Firebase imports remain
- [ ] All tests pass
- [ ] Vercel deployment works
- [ ] EAS build works
- [ ] Documentation is accurate
- [ ] No broken links in docs
- [ ] .gitignore is clean

## Rollback Plan

If issues are discovered:

1. **Keep a Firebase branch** before this PR
2. **Tag the commit** before Firebase removal
3. **Can revert** individual files if needed

```bash
# Create backup branch
git checkout -b backup-before-firebase-removal

# Tag the commit
git tag pre-firebase-removal

# If rollback needed
git checkout pre-firebase-removal
git checkout -b fix-rollback
# Cherry-pick fixes
```

## Files Summary

**Deleted files:**
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`
- `.firebaserc`
- `web/lib/firebase.ts`
- `mobile/src/config/firebase.ts`
- `mobile/google-services.json` (if exists)
- `mobile/GoogleService-Info.plist` (if exists)
- `functions/` (entire directory)

**Modified files:**
- `web/package.json` (remove firebase dependencies)
- `mobile/package.json` (remove firebase dependencies)
- `mobile/app.config.ts` (remove google-services reference)
- `README.md` (update architecture and tech stack)
- `QUICKSTART.md` (remove Firebase setup, add Supabase)
- `DEPLOYMENT.md` (remove Firebase deployment, add Vercel)
- `.gitignore` (update for Vercel)

**Archived/Deleted documentation:**
- `FIREBASE_AUTH_FIX.md`
- `FIREBASE_FUNCTIONS_MIGRATION.md`
- `cloudbuild-android.yaml`

## Estimated Complexity
- **Lines of code changed:** ~200
- **Files deleted:** ~15
- **Files modified:** ~10
- **Estimated time:** 2-3 hours
- **Risk level:** Low (cleanup task, easy to rollback)

## Success Criteria

✅ No Firebase dependencies in package.json files
✅ No Firebase imports in code
✅ No Firebase configuration files
✅ Web app builds and deploys to Vercel
✅ Mobile app builds with EAS
✅ All tests pass
✅ Documentation accurate
✅ No regression in functionality
