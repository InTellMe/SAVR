# 5-Minute Firebase Deployment Fix Checklist

## Before You Start
- [ ] I have admin access to https://github.com/InTellMe/SAVR
- [ ] I have access to Firebase Console (https://console.firebase.google.com)
- [ ] I have access to Stripe Dashboard (https://dashboard.stripe.com)

---

## Step 1: Open GitHub Secrets Page
- [ ] Go to: https://github.com/InTellMe/SAVR/settings/secrets/actions
- [ ] Click: "New repository secret"

---

## Step 2: Get Firebase Token
- [ ] Open terminal
- [ ] Run: `npm install -g firebase-tools` (if not installed)
- [ ] Run: `firebase login:ci`
- [ ] Copy the token that appears (starts with `1//0g...`)
- [ ] Add as secret: `FIREBASE_TOKEN` = [paste token]

---

## Step 3: Get Firebase Project ID
- [ ] Go to: https://console.firebase.google.com
- [ ] Select your SAVR project
- [ ] Click gear icon ⚙️ → "Project Settings"
- [ ] Copy "Project ID"
- [ ] Add as secret: `FIREBASE_PROJECT_ID` = [paste project ID]

---

## Step 4: Get Firebase Web App Config
- [ ] Still in Firebase Console → Project Settings
- [ ] Scroll down to "Your apps"
- [ ] Click on your Web app (or add one if none exists)
- [ ] You'll see a config object with these values:

### Add these 6 secrets:
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY` = [apiKey from config]
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = [authDomain from config]
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = [projectId from config]
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = [storageBucket from config]
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` = [messagingSenderId from config]
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID` = [appId from config]

---

## Step 5: Get Stripe Key
- [ ] Go to: https://dashboard.stripe.com/apikeys
- [ ] Copy "Publishable key" (starts with `pk_test_...` or `pk_live_...`)
- [ ] Add as secret: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = [paste key]

---

## Step 6: Set App URL
- [ ] Decide on your production URL (e.g., `https://www.SAVR.cam`)
- [ ] Add as secret: `NEXT_PUBLIC_APP_URL` = [your URL]

---

## Step 7: Verify All Secrets Are Added

Go to: https://github.com/InTellMe/SAVR/settings/secrets/actions

You should see these 10 secrets (values hidden):
- [ ] FIREBASE_TOKEN
- [ ] FIREBASE_PROJECT_ID
- [ ] NEXT_PUBLIC_FIREBASE_API_KEY
- [ ] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- [ ] NEXT_PUBLIC_FIREBASE_PROJECT_ID
- [ ] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- [ ] NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- [ ] NEXT_PUBLIC_FIREBASE_APP_ID
- [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- [ ] NEXT_PUBLIC_APP_URL

---

## Step 8: Trigger Deployment

### Option A: Re-run Failed Workflow
- [ ] Go to: https://github.com/InTellMe/SAVR/actions
- [ ] Click on the latest "Firebase Deploy" workflow
- [ ] Click "Re-run all jobs"

### Option B: Push Empty Commit
```bash
git commit --allow-empty -m "Trigger deployment after configuring secrets"
git push origin main
```

---

## Step 9: Verify Success
- [ ] Go to: https://github.com/InTellMe/SAVR/actions
- [ ] Watch the "Firebase Deploy" workflow
- [ ] Should see ✅ green checkmarks
- [ ] Validation step should show "✓ All required secrets are configured"
- [ ] Deployment should complete successfully

---

## ✅ Done!
Future deployments will now work automatically on every push to main.

---

## 🆘 Having Issues?

### Secrets not working?
- Verify secret names are EXACT (case-sensitive)
- Check for extra spaces in values
- Regenerate Firebase token: `firebase login:ci`
- Make sure you clicked "Add secret" after pasting each value

### Build still failing?
- Good! Secrets are working
- Check workflow logs for specific errors
- May need to fix code issues (different from secrets issue)

### Need more help?
- See: [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) for detailed guide
- See: [DEPLOYMENT_BLOCKED_README.md](DEPLOYMENT_BLOCKED_README.md) for explanation
- See: [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md) for common issues

---

**Time to complete**: 5-10 minutes  
**One-time setup**: Yes (secrets persist across all future deployments)  
**Required access**: Admin access to GitHub repository, Firebase project, and Stripe account
