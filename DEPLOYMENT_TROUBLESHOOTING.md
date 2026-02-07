# SAVR Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. "Cannot find module 'balanced-match'" Error During Deployment

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

### 2. Web Build Fails or Missing Static Files

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

### 3. Functions Predeploy Lint Fails with TypeScript Errors

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

### 4. Firebase Deploy Permission Denied

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

### 5. Environment Variables Not Found

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
3. Contact the InTellMe development team
