# SAVR Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. GitHub Actions Firebase Authentication Failure

**Error Messages:**
```
Error: Failed to authenticate, have you run firebase login?
```
or
```
⚠ Firebase env vars missing during build — using dummy config for prerender.
```

**Root Cause:**
GitHub Actions secrets are not being properly injected into the workflow environment. This can happen due to:
- Secrets not configured in GitHub repository settings
- Workflow triggered from a forked repository (secrets unavailable for security)
- Incorrect secret names or references in workflow file
- Missing required authentication credentials

**Solution:**

1. **Verify all secrets are configured in GitHub:**
   - Navigate to: `Repository → Settings → Secrets and variables → Actions`
   - Ensure ALL required secrets are present (see [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md))

2. **Check Firebase authentication method:**
   
   The workflow supports TWO authentication methods (choose ONE):
   
   **Method A: Token-based authentication**
   ```bash
   # Generate token locally
   firebase login:ci
   
   # Add to GitHub Secrets:
   # Name: FIREBASE_TOKEN
   # Value: [paste the 1//0g... token]
   ```
   
   **Method B: Service account authentication (recommended for production)**
   ```bash
   # In Firebase Console:
   # Project Settings → Service Accounts → Generate new private key
   
   # Add to GitHub Secrets:
   # Name: FIREBASE_SERVICE_ACCOUNT_JSON
   # Value: [paste entire JSON file content]
   ```

3. **Required secrets checklist:**
   - ✅ `FIREBASE_PROJECT_ID` - Your Firebase project ID
   - ✅ `FIREBASE_TOKEN` OR `FIREBASE_SERVICE_ACCOUNT_JSON` - At least one required
   - ✅ `NEXT_PUBLIC_FIREBASE_API_KEY`
   - ✅ `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - ✅ `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - ✅ `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - ✅ `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - ✅ `NEXT_PUBLIC_FIREBASE_APP_ID`
   - ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - ✅ `NEXT_PUBLIC_APP_URL`

4. **Verify workflow run context:**
   - The workflow will automatically validate secrets and fail fast with clear error messages
   - Check the "Validate Required Secrets" step output in GitHub Actions logs
   - Ensure the workflow is triggered from a direct push to `main`, not from a fork/PR

**Important Notes:**
- GitHub Actions secrets are **NOT** available to workflows triggered from forked repositories
- The workflow includes built-in validation that checks all secrets before attempting deployment
- Secret values are never printed in logs for security
- Missing secrets will cause the workflow to fail early with helpful error messages

**Prevention:**
Follow the complete setup guide in [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) to configure all required secrets before the first deployment.

### 2. Firebase Gen1 to Gen2 Function Migration Error

**Error Message:**
```
Error: [analyzeImage(us-central1)] Upgrading from 1st Gen to 2nd Gen is not yet supported. 
See https://firebase.google.com/docs/functions/2nd-gen-upgrade before migrating to 2nd Gen.
```

**Root Cause:**
Firebase Cloud Functions does not support automatic in-place upgrades from Gen1 to Gen2. When a function already exists in Firebase as Gen1 and you try to deploy it as Gen2, Firebase rejects the deployment.

**Solution:**

You must manually delete the Gen1 function before deploying the Gen2 version:

1. **Delete the existing Gen1 function(s):**
   ```bash
   firebase functions:delete analyzeImage --region us-central1 --force
   ```

2. **Deploy the new Gen2 function:**
   ```bash
   firebase deploy --only functions
   ```

3. **If multiple functions need migration, delete them all first:**
   ```bash
   firebase functions:delete analyzeImage createGroceryList chat stripeWebhook --region us-central1 --force
   ```

**Important Notes:**
- ⚠️ **Deleting a function will cause downtime** - Users won't be able to call it until the new version is deployed
- ⚠️ **Schedule maintenance window** if possible to minimize user impact
- All functions in this repository are now Gen2 (using `firebase-functions/v2`)
- The `onUserCreate` trigger uses Gen1 API as auth triggers aren't yet available in Gen2

**Prevention:**
This is a one-time migration issue. Once all functions are deployed as Gen2, future deployments will work normally.

### 3. Next.js Multiple Lockfiles Warning

**Warning Message:**
```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
 We detected multiple lockfiles and selected the directory of C:\Users\...\package-lock.json as the root directory.
```

**Root Cause:**
This is a monorepo with multiple package-lock.json files (root, web, functions, mobile). Next.js needs to know which is the correct workspace root.

**Solution:**
The `web/next.config.ts` has been updated with explicit turbopack root configuration to silence this warning:

```typescript
turbopack: {
  root: path.resolve(__dirname, ".."),
}
```

No action needed - warning is now suppressed.

### 4. MetadataLookupWarning During Deployment

**Warning Message:**
```
(node:45436) MetadataLookupWarning: received unexpected error = All promises were rejected code = UNKNOWN
```

**Root Cause:**
This is a harmless warning from Firebase Functions deployment when running locally. It occurs because the deployment process tries to fetch metadata from Google Cloud Metadata Service, which is not available in local environments.

**Solution:**
This warning can be safely ignored. It does not affect deployment success. If you want to suppress it, you can:

1. Add to your deployment command:
   ```bash
   NODE_OPTIONS="--no-warnings" npm run deploy
   ```

2. Or add to functions/package.json scripts:
   ```json
   "deploy": "node --no-warnings $(which firebase) deploy --only functions"
   ```

**Note:** This warning does not appear in CI/CD environments or Cloud Build deployments.

### 5. "Cannot find module 'balanced-match'" Error During Deployment

**Error Message:**
```
Error: Cannot find module 'balanced-match'
Require stack:
- C:\Users\...\SAVR\functions\node_modules\@eslint\eslintrc\node_modules\brace-expansion\index.js
...
Error: functions predeploy error: Command terminated with non-zero exit code 2
```

**Root Cause:**
The `functions/node_modules` directory is missing or incomplete. This can happen when:
- Cloning a fresh repository (node_modules is excluded from git)
- Dependencies become corrupted
- Package lock file is out of sync

**Solution:**

1. Install dependencies in the functions directory:
   ```bash
   cd functions
   npm install
   cd ..
   ```

2. Alternatively, use the automated setup script:
   
   **Linux/Mac:**
   ```bash
   ./setup.sh
   ```
   
   **Windows:**
   ```cmd
   setup.bat
   ```

3. Verify the fix by running the predeploy checks:
   ```bash
   cd functions
   npm run lint
   npm run build
   cd ..
   ```

4. Now deployment should work:
   ```bash
   npm run deploy
   ```

### 6. Web Build Fails or Missing Static Files

**Error Message:**
```
Error: Firebase Hosting could not find web/out directory
```

**Root Cause:**
The web application's dependencies are not installed or the build hasn't been run.

**Solution:**

1. Install web dependencies:
   ```bash
   cd web
   npm install
   cd ..
   ```

2. Build the web application:
   ```bash
   cd web
   npm run build
   cd ..
   ```

3. Verify the `web/out` directory was created:
   ```bash
   ls -la web/out
   ```

### 7. Functions Predeploy Lint Fails with TypeScript Errors

**Root Cause:**
TypeScript compilation issues or ESLint configuration problems.

**Solution:**

1. Build the TypeScript code:
   ```bash
   cd functions
   npm run build
   ```

2. Fix any TypeScript errors shown in the output.

3. Run lint again:
   ```bash
   npm run lint
   ```

### 8. Firebase Deploy Permission Denied

**Root Cause:**
Not logged into Firebase CLI or wrong project selected.

**Solution:**

1. Login to Firebase:
   ```bash
   firebase login
   ```

2. Verify the correct project is selected:
   ```bash
   firebase projects:list
   firebase use <project-id>
   ```

### 9. Environment Variables Not Found

**Root Cause:**
Environment variables are not configured for Firebase Functions or the web application.

**Solution:**

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required values from your Firebase Console, OpenAI, and Stripe accounts.

3. For Cloud Functions, set Firebase environment variables:
   ```bash
   firebase functions:config:set openai.key="your-key" stripe.secret_key="your-key"
   ```

## Best Practices

1. **Always run the setup script** after cloning the repository:
   - Linux/Mac: `./setup.sh`
   - Windows: `setup.bat`

2. **Before deploying**, ensure all dependencies are installed and builds succeed:
   ```bash
   # Test web build
   cd web && npm run build && cd ..
   
   # Test functions build and lint
   cd functions && npm run lint && npm run build && cd ..
   ```

3. **Use the automated deploy script** from the root directory:
   ```bash
   npm run deploy
   ```
   This automatically builds the web application before deploying.

4. **Keep package-lock.json files** in version control (they're already tracked in the repository).

5. **Never commit node_modules** - they're automatically excluded by .gitignore.

## Getting Help

If you encounter issues not covered here:
1. Check Firebase logs: `firebase functions:log`
2. Run with debug mode: `firebase deploy --debug`
3. Contact the GooseyPrime development team
