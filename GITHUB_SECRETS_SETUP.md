# GitHub Secrets Setup Guide for SAVR Deployment

**Quick Reference**: How to configure GitHub Secrets to enable automated deployment

---

## Prerequisites

Before configuring secrets, ensure you have:
- [ ] Admin access to the InTellMe/SAVR repository
- [ ] Access to Firebase Console for your project
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Stripe Dashboard access (for Stripe keys)

---

## Step 1: Access GitHub Secrets

1. Navigate to: https://github.com/InTellMe/SAVR/settings/secrets/actions
2. Or: Repository → Settings → Secrets and variables → Actions → Repository secrets

---

## Step 2: Generate Firebase Token

The `FIREBASE_TOKEN` is required for CI/CD to deploy to Firebase.

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login and generate CI token
firebase login:ci
```

**Output will look like:**
```
Visit this URL on this device to log in:
https://accounts.google.com/o/oauth2/auth...

Waiting for authentication...

✔  Success! Use this token to login on a CI server:

1//0gABCDEFGHIJKLMNOPQRSTUVWXYZ...
```

**Copy the token** (the long string starting with `1//0g...`)

---

## Step 3: Get Firebase Configuration Values

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your SAVR project
3. Click the gear icon (⚙️) → Project Settings
4. Scroll down to "Your apps" section
5. Click on your Web app (or add one if none exists)
6. You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

**Note down each value** - you'll need them in Step 5.

---

## Step 4: Get Stripe Publishable Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to: Developers → API keys
3. Copy the **Publishable key** (starts with `pk_live_` for production or `pk_test_` for testing)

---

## Step 5: Add Secrets to GitHub

For each secret below, in GitHub:
1. Click "New repository secret"
2. Enter the **Name** (exactly as shown, case-sensitive)
3. Paste the **Value**
4. Click "Add secret"

### Secret 1: FIREBASE_TOKEN
- **Name**: `FIREBASE_TOKEN`
- **Value**: Token from Step 2 (the long string starting with `1//0g...`)

### Secret 2: FIREBASE_PROJECT_ID
- **Name**: `FIREBASE_PROJECT_ID`
- **Value**: Your Firebase project ID (e.g., `savr-production-123`)

### Secret 3: NEXT_PUBLIC_FIREBASE_API_KEY
- **Name**: `NEXT_PUBLIC_FIREBASE_API_KEY`
- **Value**: `apiKey` from Firebase config in Step 3

### Secret 4: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- **Name**: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- **Value**: `authDomain` from Firebase config in Step 3

### Secret 5: NEXT_PUBLIC_FIREBASE_PROJECT_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- **Value**: `projectId` from Firebase config in Step 3

### Secret 6: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- **Name**: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- **Value**: `storageBucket` from Firebase config in Step 3

### Secret 7: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- **Value**: `messagingSenderId` from Firebase config in Step 3

### Secret 8: NEXT_PUBLIC_FIREBASE_APP_ID
- **Name**: `NEXT_PUBLIC_FIREBASE_APP_ID`
- **Value**: `appId` from Firebase config in Step 3

### Secret 9: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- **Name**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Value**: Stripe publishable key from Step 4

### Secret 10: NEXT_PUBLIC_APP_URL
- **Name**: `NEXT_PUBLIC_APP_URL`
- **Value**: Your production URL (e.g., `https://www.SAVR.cam`)

---

## Step 6: Verify Secrets Are Added

After adding all secrets, you should see 10 secrets listed:
- ✅ FIREBASE_TOKEN
- ✅ FIREBASE_PROJECT_ID
- ✅ NEXT_PUBLIC_FIREBASE_API_KEY
- ✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- ✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID
- ✅ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- ✅ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- ✅ NEXT_PUBLIC_FIREBASE_APP_ID
- ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- ✅ NEXT_PUBLIC_APP_URL

---

## Step 7: Trigger a Deployment

### Option A: Re-run Failed Workflow
1. Go to: https://github.com/InTellMe/SAVR/actions
2. Click on the most recent "Firebase Deploy" run
3. Click "Re-run all jobs"

### Option B: Push a Change
```bash
git commit --allow-empty -m "Trigger deployment after secrets configuration"
git push origin main
```

### Option C: Push to Main Branch
Make any small change to a file on main branch (or merge a PR), which will automatically trigger deployment.

---

## Step 8: Verify Deployment

1. **Watch the workflow**:
   - Go to: https://github.com/InTellMe/SAVR/actions
   - Click on the running "Firebase Deploy" workflow
   - Verify it progresses through steps (not startup_failure anymore)

2. **Check for success**:
   - Wait for workflow to complete
   - Verify status shows ✅ green checkmark

3. **Test production site**:
   - Visit your production URL
   - Check for PR #46 features:
     - Navigate to `/faq` - new FAQ page should load
     - Check pricing page - should show "Start 5-Day Free Trial"
     - Test the subscription flow

---

## Troubleshooting

### Still Getting startup_failure?
- Double-check all secret names are **exactly** as shown (case-sensitive)
- Ensure no extra spaces in secret values
- Verify you have admin access to the repository

### Workflow starts but fails during build?
- Good news: secrets are working!
- Check the workflow logs for specific error messages
- Common issues:
  - Invalid Firebase token (regenerate with `firebase login:ci`)
  - Incorrect project ID
  - Build errors in code (check build logs)

### Cannot find firebase project?
- Verify `FIREBASE_PROJECT_ID` matches your actual Firebase project ID
- In Firebase Console, check: Project Settings → General → Project ID

---

## Security Notes

### Public vs Private Secrets
- **NEXT_PUBLIC_* secrets**: These are intentionally public and will be visible in browser JavaScript. They are safe to use client-side.
- **FIREBASE_TOKEN**: This is sensitive and should never be shared or committed to code.

### Secret Rotation
If you need to rotate secrets (e.g., if Firebase token is compromised):
1. Generate new token: `firebase login:ci`
2. In GitHub Secrets, click the secret name
3. Click "Update secret"
4. Paste new value and save

---

## Complete Checklist

Use this checklist to verify setup:

- [ ] Installed Firebase CLI
- [ ] Generated Firebase token with `firebase login:ci`
- [ ] Collected all Firebase config values from Console
- [ ] Got Stripe publishable key
- [ ] Added all 10 secrets to GitHub repository
- [ ] Verified all secret names are correct (case-sensitive)
- [ ] Triggered a new deployment
- [ ] Watched workflow complete successfully
- [ ] Verified production site has new changes

---

## Quick Reference Table

| Secret Name | Source | Example Format |
|------------|--------|----------------|
| FIREBASE_TOKEN | `firebase login:ci` | `1//0gABCD...` |
| FIREBASE_PROJECT_ID | Firebase Console | `savr-prod-123` |
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebase Web Config | `AIzaSyABC...` |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Firebase Web Config | `project.firebaseapp.com` |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Firebase Web Config | `savr-prod-123` |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | Firebase Web Config | `project.appspot.com` |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Firebase Web Config | `123456789012` |
| NEXT_PUBLIC_FIREBASE_APP_ID | Firebase Web Config | `1:123:web:abc` |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe Dashboard | `pk_live_...` or `pk_test_...` |
| NEXT_PUBLIC_APP_URL | Your Domain | `https://www.SAVR.cam` |

---

## Need Help?

- **Deployment docs**: See `DEPLOYMENT.md` in repository root
- **Troubleshooting**: See `DEPLOYMENT_TROUBLESHOOTING.md`
- **Firebase docs**: https://firebase.google.com/docs/cli
- **GitHub Actions docs**: https://docs.github.com/en/actions

---

**Last Updated**: February 2026  
**Version**: 1.0.0
