# Domain Configuration for SAVR

## Production Domain

**Primary Domain**: `https://savr.cam`  
**WWW Redirect**: `https://www.savr.cam` → `https://savr.cam` (301 redirect)

## Firebase Hosting Setup

### Step 1: Configure Primary Domain

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter: `savr.cam`
4. Follow DNS verification steps
5. Wait for SSL certificate provisioning (up to 24 hours)

### Step 2: Configure WWW Redirect

1. In Firebase Hosting, click "Add custom domain" again
2. Enter: `www.savr.cam`
3. Firebase will automatically redirect www → non-www
4. Follow DNS verification steps

### DNS Configuration

For both domains, you'll need to add DNS records pointing to Firebase:

```
Type: A
Name: @ (for savr.cam)
Value: [Firebase IP addresses provided during setup]

Type: A
Name: www (for www.savr.cam)
Value: [Firebase IP addresses provided during setup]
```

## Environment Variables

Ensure all systems use the canonical URL:

- `NEXT_PUBLIC_APP_URL=https://savr.cam`
- Set in GitHub Secrets → Production environment
- Set in Firebase Functions environment variables

## Stripe Configuration

Update Stripe Dashboard settings:

1. **Webhook Endpoints**: Use `https://savr.cam` as base URL
2. **Pricing Table Settings**: Ensure success/cancel URLs use `https://savr.cam`
3. **Customer Portal**: Return URLs use `https://savr.cam`

## Testing

After deployment, verify:

1. `https://savr.cam` - loads correctly ✓
2. `https://www.savr.cam` - redirects to `https://savr.cam` ✓
3. Pricing table displays on `/pricing` page ✓
4. Stripe checkout redirects work correctly ✓
5. Billing portal redirects work correctly ✓

## Why No WWW?

- Cleaner, shorter URL
- Better for mobile typing
- Consistent with modern web conventions
- Simplified configuration (one canonical URL)
