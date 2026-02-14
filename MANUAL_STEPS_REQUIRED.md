# Manual Configuration Steps Required

After merging these code changes, the following manual steps must be completed to fully implement the URL changes and fix the pricing table.

## 1. Update GitHub Secrets

Go to: Repository Settings → Environments → Production → Secrets

Update the following secret:
- **Name**: `NEXT_PUBLIC_APP_URL`
- **Value**: `https://savr.cam` (lowercase, no www)

## 2. Configure Firebase Hosting Custom Domain

### Step 1: Configure Primary Domain (savr.cam)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to: Hosting → Custom domain
4. Click "Add custom domain"
5. Enter: `savr.cam`
6. Follow the DNS verification steps
7. Add the provided DNS records to your domain registrar
8. Wait for SSL certificate provisioning (can take up to 24 hours)

### Step 2: Configure WWW Redirect (www.savr.cam)
1. In Firebase Hosting, click "Add custom domain" again
2. Enter: `www.savr.cam`
3. Select "Redirect to an existing website" if prompted
4. Choose to redirect to: `savr.cam`
5. Follow the DNS verification steps
6. Add the provided DNS records to your domain registrar

**Note**: Firebase Hosting automatically handles the 301 redirect from www to non-www when both domains are configured.

## 3. Update Firebase Functions Environment Variables

Go to: Google Cloud Console → Cloud Functions

For each function (or globally), update the environment variable:
- **Name**: `NEXT_PUBLIC_APP_URL`
- **Value**: `https://savr.cam`

This ensures the billing portal and other redirects use the correct URL.

## 4. Update Stripe Configuration

### Webhook Endpoints
1. Go to: Stripe Dashboard → Developers → Webhooks
2. Update your production webhook endpoint URL to use `https://savr.cam` as the base
3. Example: `https://savr.cam/api/stripe-webhook` or your Firebase Functions webhook URL

### Pricing Table
1. Go to: Stripe Dashboard → Products → Pricing tables
2. Select your pricing table
3. Verify success/cancel redirect URLs use `https://savr.cam`
4. Example success URL: `https://savr.cam/dashboard?success=true`
5. Example cancel URL: `https://savr.cam/pricing?canceled=true`

### Customer Portal
1. Go to: Stripe Dashboard → Settings → Customer portal
2. Update return URLs to use: `https://savr.cam`
3. Example: `https://savr.cam/settings`

## 5. Update Firebase Authentication Authorized Domains

1. Go to: Firebase Console → Authentication → Settings → Authorized domains
2. Ensure both domains are listed:
   - `savr.cam`
   - `www.savr.cam`
3. Remove old references if they exist (like `www.SAVR.cam` with uppercase)

## 6. Verify Pricing Table Display

### Check GitHub Secrets
Ensure these secrets are set in Production environment:
- ✅ `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID`
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- ✅ `NEXT_PUBLIC_APP_URL` (updated to `https://savr.cam`)

### Test After Deployment
1. Navigate to: `https://savr.cam/pricing`
2. Sign in with a test account
3. Verify the Stripe Pricing Table appears
4. Test checkout flow with Stripe test cards
5. Verify redirect back to site after successful checkout

## 7. Test WWW Redirect

1. Visit: `https://www.savr.cam`
2. Verify it redirects to: `https://savr.cam`
3. Check that the redirect is a 301 (permanent redirect)
4. Use browser dev tools or `curl -I https://www.savr.cam` to verify

## Troubleshooting

### Pricing Table Not Showing
- Verify `NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID` secret is set in GitHub
- Check browser console for errors
- Verify the pricing table ID matches your Stripe Dashboard
- Ensure you're signed in (pricing table only shows for authenticated users)

### WWW Redirect Not Working
- Wait up to 24 hours for DNS propagation
- Check DNS records with: `dig savr.cam` and `dig www.savr.cam`
- Verify both domains are configured in Firebase Hosting
- Check Firebase Hosting deployment logs

### Stripe Webhooks Failing
- Verify webhook URL uses `https://savr.cam` base
- Check webhook signature verification in Firebase Functions logs
- Ensure `STRIPE_WEBHOOK_SECRET` is configured in Firebase Functions
- Test webhook delivery in Stripe Dashboard

## Verification Checklist

After completing all steps, verify:
- [ ] `https://savr.cam` loads correctly
- [ ] `https://www.savr.cam` redirects to `https://savr.cam`
- [ ] Pricing table displays on `/pricing` page when signed in
- [ ] Stripe checkout flow works end-to-end
- [ ] Billing portal opens and returns correctly
- [ ] Stripe webhooks are being received
- [ ] Mobile app can access the site
- [ ] Email notifications use correct URLs

## Support

If you encounter issues:
1. Check Firebase Console → Functions → Logs
2. Check Stripe Dashboard → Developers → Webhooks → Events
3. Check browser developer console for errors
4. Review GitHub Actions deployment logs
