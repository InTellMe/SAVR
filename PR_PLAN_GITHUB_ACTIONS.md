# PR Plan: GitHub Actions Workflow Updates

## Overview
Update GitHub Actions workflows to support the new Supabase + Vercel + EAS architecture. This includes removing Firebase deployment steps and adding Vercel deployment configuration.

## Scope

### Current Workflows

1. **`.github/workflows/firebase-deploy.yml`**
   - Currently deploys to Firebase Hosting and Cloud Functions
   - Needs to be replaced with Vercel deployment

2. **`.github/workflows/mobile-build.yml`**
   - Currently uses Firebase environment variables
   - Needs to use Supabase environment variables

### New Workflows

#### 1. Vercel Deployment Workflow

**Create `.github/workflows/vercel-deploy.yml`:**
```yaml
name: Vercel Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: Production
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: web/package-lock.json

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: web

      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: web
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY }}
          NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID: ${{ secrets.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID }}
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}

      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: web

      - name: Run Database Migrations
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: |
          # Install Supabase CLI
          npm install -g supabase
          
          # Push migrations
          supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }} --password ${{ secrets.SUPABASE_DB_PASSWORD }}
```

#### 2. Preview Deployment Workflow

**Create `.github/workflows/preview-deploy.yml`:**
```yaml
name: Preview Deployment

on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths:
      - 'web/**'

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: web/package-lock.json

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: web

      - name: Build Project Artifacts
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: web
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY }}
          NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID: ${{ secrets.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID }}
          NEXT_PUBLIC_APP_URL: https://preview-savr.vercel.app

      - name: Deploy Preview to Vercel
        id: deploy
        run: |
          URL=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "preview_url=$URL" >> $GITHUB_OUTPUT
        working-directory: web

      - name: Comment Preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Preview deployment ready!\n\n🔗 **Preview URL:** ${{ steps.deploy.outputs.preview_url }}'
            })
```

#### 3. Updated Mobile Build Workflow

**Modify `.github/workflows/mobile-build.yml`:**
```yaml
name: Mobile Build (EAS)
permissions:
  contents: read

on:
  push:
    branches: [main]
    paths:
      - 'mobile/**'
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to build (android, ios, all)'
        required: true
        default: 'android'
        type: choice
        options:
          - android
          - ios
          - all
      profile:
        description: 'Build profile'
        required: true
        default: 'preview'
        type: choice
        options:
          - development
          - preview
          - production

jobs:
  build:
    runs-on: ubuntu-latest
    environment: Production
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci
        working-directory: mobile

      - name: TypeScript check
        run: npx tsc --noEmit
        working-directory: mobile

      - name: Build Android (auto push)
        if: github.event_name == 'push'
        run: eas build --platform android --profile preview --non-interactive
        working-directory: mobile
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          EXPO_PUBLIC_GOOGLE_CLIENT_ID: ${{ secrets.EXPO_PUBLIC_GOOGLE_CLIENT_ID }}
          EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: ${{ secrets.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID }}
          EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: ${{ secrets.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID }}

      - name: Build (manual dispatch)
        if: github.event_name == 'workflow_dispatch'
        run: eas build --platform ${{ inputs.platform }} --profile ${{ inputs.profile }} --non-interactive
        working-directory: mobile
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          EXPO_PUBLIC_GOOGLE_CLIENT_ID: ${{ secrets.EXPO_PUBLIC_GOOGLE_CLIENT_ID }}
          EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: ${{ secrets.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID }}
          EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: ${{ secrets.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID }}

  submit-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'workflow_dispatch' && inputs.profile == 'production'
    environment: Production
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci
        working-directory: mobile

      - name: Submit to Google Play (Internal Track)
        if: inputs.platform == 'android' || inputs.platform == 'all'
        run: eas submit --platform android --latest --non-interactive
        working-directory: mobile
        env:
          GOOGLE_SERVICE_ACCOUNT_KEY: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY }}
```

#### 4. CI Validation Workflow

**Create `.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: web/package-lock.json
      - run: npm ci
        working-directory: web
      - run: npm run lint
        working-directory: web

  typecheck-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: web/package-lock.json
      - run: npm ci
        working-directory: web
      - run: npx tsc --noEmit
        working-directory: web

  typecheck-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: mobile/package-lock.json
      - run: npm ci
        working-directory: mobile
      - run: npx tsc --noEmit
        working-directory: mobile
```

## GitHub Secrets to Configure

### Vercel Secrets

1. **`VERCEL_TOKEN`**
   - Get from: https://vercel.com/account/tokens
   - Create a token with full access

2. **`VERCEL_ORG_ID`**
   - Get from: Vercel project settings → General
   - Or from `.vercel/project.json` after running `vercel link`

3. **`VERCEL_PROJECT_ID`**
   - Get from: Vercel project settings → General
   - Or from `.vercel/project.json` after running `vercel link`

### Supabase Secrets

1. **`NEXT_PUBLIC_SUPABASE_URL`**
   - Get from: Supabase Dashboard → Project Settings → API

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - Get from: Supabase Dashboard → Project Settings → API

3. **`SUPABASE_SERVICE_ROLE_KEY`**
   - Get from: Supabase Dashboard → Project Settings → API
   - ⚠️ Keep this secret!

4. **`SUPABASE_PROJECT_REF`** (for migrations)
   - Get from: Supabase Dashboard URL (e.g., `abcdefghijk`)

5. **`SUPABASE_DB_PASSWORD`** (for migrations)
   - The database password you set when creating the project

### Stripe Secrets (Already Configured)

1. **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`**
2. **`STRIPE_SECRET_KEY`**
3. **`STRIPE_WEBHOOK_SECRET`**
4. **`NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`**

### Mobile Secrets (Already Configured)

1. **`EXPO_TOKEN`**
2. **`GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`**
3. **`EXPO_PUBLIC_GOOGLE_CLIENT_ID`**
4. **`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`**
5. **`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`**

### App Configuration

1. **`NEXT_PUBLIC_APP_URL`**
   - Production: `https://savr.cam`

## Implementation Steps

1. **Phase 1: Configure Vercel**
   - Link Vercel project to GitHub repo
   - Configure environment variables in Vercel dashboard
   - Get Vercel credentials (token, org ID, project ID)

2. **Phase 2: Update GitHub Secrets**
   - Add all Vercel-related secrets
   - Add Supabase secrets (if not already added)
   - Update mobile secrets to use EXPO_PUBLIC_* versions

3. **Phase 3: Create New Workflows**
   - Create vercel-deploy.yml
   - Create preview-deploy.yml
   - Create ci.yml
   - Test workflows on a test branch

4. **Phase 4: Update Mobile Workflow**
   - Update mobile-build.yml with Supabase variables
   - Test mobile build workflow

5. **Phase 5: Deprecate Firebase Workflow**
   - Rename firebase-deploy.yml to firebase-deploy.yml.deprecated
   - Or delete if confident in new workflow

6. **Phase 6: Test Everything**
   - Create a test PR to verify preview deployments
   - Merge to main to verify production deployment
   - Test mobile build workflow

## Vercel Configuration

### Option A: Vercel Git Integration (Recommended)

Vercel can automatically deploy on Git push without GitHub Actions:

1. Connect Vercel to GitHub repository
2. Configure build settings in Vercel dashboard
3. Environment variables in Vercel
4. Auto-deploy on push to main

**Benefits:**
- Simpler setup
- No GitHub Actions minutes used
- Built-in preview deployments
- Better integration with Vercel features

**With this approach, you can simplify or remove the Vercel deployment workflow.**

### Option B: GitHub Actions Deployment

Use the workflows defined above for more control.

**Benefits:**
- More control over deployment process
- Can run additional steps (migrations, tests)
- Consistent with other CI/CD workflows

## Migration Strategy

### Recommended Approach

1. **Keep Firebase workflow temporarily** for rollback capability
2. **Test Vercel deployment** on a feature branch
3. **Verify everything works** in production
4. **Remove Firebase workflow** after 1-2 weeks of stable Vercel deployment

### Rollback Plan

If Vercel deployment fails:
1. Revert to Firebase deployment workflow
2. Fix issues in staging/development
3. Try Vercel deployment again

## Files Summary

**New files:**
- `.github/workflows/vercel-deploy.yml`
- `.github/workflows/preview-deploy.yml`
- `.github/workflows/ci.yml`

**Modified files:**
- `.github/workflows/mobile-build.yml`

**Deprecated files:**
- `.github/workflows/firebase-deploy.yml` (rename or delete)

**Documentation updates:**
- `GITHUB_SECRETS_SETUP.md` - Update with new secrets
- `DEPLOYMENT.md` - Update deployment process

## Testing Checklist

- [ ] Configure Vercel project
- [ ] Add all GitHub secrets
- [ ] Test preview deployment on PR
- [ ] Test production deployment on main
- [ ] Verify mobile build works
- [ ] Test database migrations workflow
- [ ] Verify CI validation passes
- [ ] Check deployment logs
- [ ] Test rollback if needed

## Estimated Complexity
- **Lines of code changed:** ~300
- **Files modified:** ~5
- **Estimated time:** 2-3 hours
- **Risk level:** Low-Medium (straightforward config changes)
