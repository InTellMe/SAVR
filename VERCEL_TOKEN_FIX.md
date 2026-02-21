# Fix: Vercel Deployment Token Error

## Problem

Vercel deployment fails with error:
```
Error: The token provided via `--token` argument is not valid. Please provide a valid token.
```

## Root Cause

The Vercel deployment secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are either:
1. Not configured in GitHub
2. Configured in the wrong location (Environment instead of Repository)
3. Invalid or expired

## Solution

### Step 1: Verify Secret Location

Vercel secrets **MUST** be configured as **Repository Secrets**, NOT Environment Secrets.

**Why?** Because:
- They're used by both `vercel-deploy.yml` (production) and `preview-deploy.yml` (previews)
- The `preview-deploy.yml` workflow doesn't use an environment
- They're referenced in the top-level `env:` section which can only access repository-level secrets

### Step 2: Add Secrets to GitHub

1. Go to your repository: https://github.com/GooseyPrime/SAVR
2. Navigate to: **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**
3. Click **"New repository secret"**
4. Add these three secrets:

#### VERCEL_TOKEN
- **Name**: `VERCEL_TOKEN`
- **Value**: Your Vercel access token
- **How to get**:
  1. Go to https://vercel.com/account/tokens
  2. Click "Create Token"
  3. Give it a name (e.g., "GitHub Actions SAVR")
  4. Select scope: "Full Account"
  5. Click "Create"
  6. Copy the token (you won't see it again!)

#### VERCEL_ORG_ID
- **Name**: `VERCEL_ORG_ID`
- **Value**: Your Vercel organization ID
- **How to get**:
  1. Go to your Vercel project: https://vercel.com/dashboard
  2. Select your SAVR project
  3. Go to **Settings** → **General**
  4. Scroll to "Project Settings"
  5. Copy the **Organization ID** (format: `team_xxxxx`)

#### VERCEL_PROJECT_ID
- **Name**: `VERCEL_PROJECT_ID`
- **Value**: Your Vercel project ID
- **How to get**:
  1. In the same location as above (Settings → General)
  2. Copy the **Project ID** (format: `prj_xxxxx`)

### Step 3: Verify Configuration

After adding the secrets:

1. Go to: https://github.com/GooseyPrime/SAVR/settings/secrets/actions
2. Under "Repository secrets", you should see:
   - ✅ VERCEL_TOKEN
   - ✅ VERCEL_ORG_ID
   - ✅ VERCEL_PROJECT_ID

### Step 4: Test the Fix

1. Go to: https://github.com/GooseyPrime/SAVR/actions
2. Click on "Vercel Deployment" workflow
3. Click "Run workflow" → "Run workflow"
4. Watch the workflow run

The "Validate Vercel Secrets" step should now pass with:
```
✅ All required Vercel secrets are configured
```

## Additional Notes

### If Token is Invalid
If you get the same error after adding the token:
1. The token might be expired or invalid
2. Generate a new token at https://vercel.com/account/tokens
3. Update the `VERCEL_TOKEN` secret in GitHub

### If Org/Project IDs are Wrong
Symptoms: Workflow passes validation but fails at "Pull Vercel Environment Information"
1. Double-check the IDs match your Vercel project
2. Ensure no extra spaces in the secret values
3. The IDs are case-sensitive

### Complete Setup
For a complete list of ALL required GitHub secrets, see:
- [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) - Complete setup guide

## Verification Checklist

- [ ] VERCEL_TOKEN added to Repository Secrets (not Environment)
- [ ] VERCEL_ORG_ID added to Repository Secrets (not Environment)
- [ ] VERCEL_PROJECT_ID added to Repository Secrets (not Environment)
- [ ] All three values copied correctly (no extra spaces)
- [ ] Workflow runs successfully
- [ ] "Validate Vercel Secrets" step passes

---

**Last Updated**: February 2026
