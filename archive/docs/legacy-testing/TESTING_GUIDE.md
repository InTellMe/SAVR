# Testing Guide: Google Sign-Up & Pricing Table Fix

## Test Scenarios

### Scenario 1: New User Sign-Up (Stripe Configured)
**Expected Behavior:** User signs up → sees pricing table → can select a plan

**Steps:**
1. Navigate to `https://savr.cam` (or your deployment URL)
2. Click "Sign Up" or "Sign up with Google"
3. Complete Google OAuth authentication
4. After redirect to `/pricing`, verify you see:
   - ✅ Blue banner: "Choose a plan to get started"
   - ✅ Brief loading spinner (< 1 second)
   - ✅ Stripe Pricing Table with Basic and Pro plans
5. Click on a plan (use Stripe test card: 4242 4242 4242 4242)
6. Complete checkout
7. Verify redirect to `/dashboard`
8. Verify subscription status is now "active" or "trialing"

**Pass Criteria:**
- Pricing table displays within 2 seconds
- User can complete checkout
- Dashboard shows active subscription

---

### Scenario 2: New User Sign-Up (Stripe NOT Configured)
**Expected Behavior:** User signs up → sees clear error message about missing configuration

**Steps:**
1. Remove Stripe secrets from GitHub (or deploy without them)
2. Navigate to sign-up page
3. Complete Google sign-up
4. After redirect to `/pricing`, verify you see:
   - ✅ Red error panel with warning icon
   - ✅ Message: "Configuration Error - The pricing table cannot be displayed because Stripe is not configured"
   - ✅ List of missing environment variables
   - ✅ Instructions for administrators

**Pass Criteria:**
- Error message is clear and actionable
- Shows exactly which env vars are missing
- No console errors or blank screens

---

### Scenario 3: Returning User with Active Subscription
**Expected Behavior:** User signs in → redirected to dashboard (skips pricing)

**Steps:**
1. Sign in with account that has active subscription
2. Verify immediate redirect to `/dashboard`
3. Navigate manually to `/pricing`
4. Verify you see:
   - ✅ "You're on the [Basic/Pro] plan" message
   - ✅ "Manage subscription & billing" button
   - ✅ NO pricing table (already subscribed)

**Pass Criteria:**
- Active users skip pricing page during sign-in
- Can access billing portal from `/pricing`

---

### Scenario 4: Returning User with Pending Subscription
**Expected Behavior:** User signs in → sees pricing table to complete sign-up

**Steps:**
1. Create user with `subscriptionStatus: 'pending'` in Firestore
2. Sign in with that account
3. Verify redirect to `/pricing`
4. Verify pricing table displays
5. Complete subscription flow

**Pass Criteria:**
- Pending users see pricing table
- Can complete subscription

---

### Scenario 5: Stripe Table Loading Timeout
**Expected Behavior:** If Stripe fails to load, show helpful error

**Setup:**
1. Block `js.stripe.com` in browser dev tools (Network tab → Block requests)
2. Sign up with Google
3. Wait 10 seconds on pricing page

**Expected:**
- ✅ Loading spinner appears initially
- ✅ After 10 seconds, error message: "Unable to load pricing table. Please check your internet connection and refresh the page."

**Pass Criteria:**
- User gets feedback if loading fails
- No infinite loading state

---

### Scenario 6: Pricing Table Loads Immediately
**Expected Behavior:** No loading state if table loads fast

**Steps:**
1. Sign up with Google (with good internet)
2. Observe pricing page load

**Expected:**
- Brief or no loading spinner
- Pricing table appears smoothly

**Pass Criteria:**
- No flickering between states
- Smooth user experience

---

## Browser Testing Matrix

Test in multiple browsers to ensure compatibility:

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ⬜ Not Tested |
| Firefox | Latest | ⬜ Not Tested |
| Safari | Latest | ⬜ Not Tested |
| Edge | Latest | ⬜ Not Tested |
| Mobile Safari | iOS 15+ | ⬜ Not Tested |
| Mobile Chrome | Android | ⬜ Not Tested |

---

## Configuration Testing

### Test 1: Missing NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID
1. Remove only the pricing table ID secret
2. Deploy and test sign-up
3. Verify error shows: "Missing environment variables: NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID"

### Test 2: Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
1. Remove only the publishable key secret
2. Deploy and test sign-up
3. Verify error shows: "Missing environment variables: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

### Test 3: Missing Both Variables
1. Remove both secrets
2. Deploy and test sign-up
3. Verify error shows: "Missing environment variables: NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

---

## Performance Testing

### Metrics to Check:
- **Pricing Page Load Time**: < 2 seconds
- **Stripe Table Render Time**: < 1 second (after script loads)
- **MutationObserver Overhead**: Negligible (< 1ms)
- **Error Detection Time**: 10 seconds maximum

### How to Measure:
```javascript
// Open browser console on /pricing page
performance.mark('pricing-start');
// Wait for table to appear
performance.mark('pricing-end');
performance.measure('pricing-load', 'pricing-start', 'pricing-end');
console.table(performance.getEntriesByType('measure'));
```

---

## Edge Cases

### Edge Case 1: Slow Network
- User on 3G connection
- Expected: Loading spinner shows, table loads eventually
- Timeout at 10 seconds with helpful error

### Edge Case 2: Ad Blocker
- User has aggressive ad blocker
- May block Stripe scripts
- Expected: Error message after timeout

### Edge Case 3: Multiple Sign-Up Attempts
- User signs up, cancels, signs up again
- Expected: Clean state, no stale data

### Edge Case 4: Session Expired During Checkout
- User starts checkout, session expires
- Expected: Graceful redirect to sign-in

---

## Automated Testing Checklist

### Unit Tests
- ✅ `getMissingEnvVars()` returns correct string
- ✅ `stripeConfigured` correctly validates env vars
- ✅ MutationObserver disconnects on cleanup
- ✅ Timeout clears properly

### Integration Tests
- ⬜ Sign-up flow creates user with pending status
- ⬜ Pricing page detects Stripe configuration
- ⬜ Error messages display correctly
- ⬜ Loading states transition properly

### E2E Tests
- ⬜ Complete sign-up to checkout flow
- ⬜ Returning user flow
- ⬜ Configuration error flow

---

## Regression Testing

Verify these existing features still work:

- ✅ Email/password sign-up
- ✅ Email/password sign-in
- ✅ Password reset
- ✅ Google sign-in (existing users)
- ✅ Stripe webhook processing
- ✅ Billing portal access
- ✅ Subscription upgrades/downgrades

---

## Acceptance Criteria

This fix is considered successful when:

1. ✅ New users see pricing table immediately after Google sign-up
2. ✅ Clear error if Stripe not configured (no blank screen)
3. ✅ Loading state prevents user confusion
4. ✅ Timeout detection catches loading failures
5. ✅ No TypeScript errors
6. ✅ No console errors in browser
7. ✅ Build completes successfully
8. ✅ Security scan shows 0 alerts
9. ✅ All existing flows continue to work
10. ✅ Performance is not degraded

---

## Rollback Plan

If issues are discovered after deployment:

1. Identify the issue severity
2. If critical (blocks all sign-ups):
   ```bash
   git revert dd171ff..HEAD
   git push origin main
   ```
3. If minor (affects some users):
   - Create hotfix PR with specific fix
   - Deploy hotfix

---

## Monitoring

After deployment, monitor:

1. **Firebase Functions Logs**: Watch for webhook errors
2. **Stripe Dashboard**: Monitor checkout.session.completed events
3. **Google Analytics**: Track sign-up completion rate
4. **Error Tracking**: Monitor any new JavaScript errors
5. **User Feedback**: Watch for support requests about sign-up

### Key Metrics:
- Sign-up completion rate should increase
- Time-to-first-subscription should decrease
- Support tickets about "can't select plan" should drop to zero

---

## Documentation Updates

After testing, update:
- ✅ FIX_SUMMARY.md - Add test results
- ✅ SIGN_UP_FIX_INSTRUCTIONS.md - Note any issues found
- ⬜ README.md - Update if needed
- ⬜ DEPLOYMENT.md - Note any new deployment steps

---

## Sign-Off

**Tested by:** ________________  
**Date:** ________________  
**Environment:** ________________  
**Result:** ⬜ Pass  ⬜ Fail  ⬜ Needs Work  

**Notes:**
