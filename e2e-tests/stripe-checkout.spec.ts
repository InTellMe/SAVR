/**
 * E2E Test: Stripe Checkout with 100% Coupon
 * 
 * Tests the complete subscription flow:
 * 1. Login with test credentials
 * 2. Navigate to pricing page
 * 3. Select a plan and apply 100% coupon
 * 4. Complete checkout (billing info only, no card)
 * 5. Return to site and verify Pro status
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL?.trim() || 'http://localhost:3000';
const TEST_EMAIL = process.env.E2E_STRIPE_TEST_EMAIL?.trim();
const TEST_PASSWORD = process.env.E2E_STRIPE_TEST_PASSWORD?.trim();
const COUPON_CODE = process.env.E2E_STRIPE_COUPON_CODE?.trim();

// Test data for billing address
const BILLING_INFO = {
  phone: '423 268 8082',
  address: '326 Delaware Street',
  city: 'Johnson City',
  state: 'TN',
  zip: '37604',
  country: 'US'
};

test.describe('Stripe Subscription Flow with 100% Coupon', () => {
  test('should complete checkout and show Pro status', async ({ page }) => {
    test.skip(
      !TEST_EMAIL || !TEST_PASSWORD || !COUPON_CODE,
      'Skipping: set E2E_STRIPE_TEST_EMAIL/E2E_STRIPE_TEST_PASSWORD/E2E_STRIPE_COUPON_CODE to enable Stripe live checkout E2E'
    );

    // Set longer timeout for the entire test
    test.setTimeout(120000); // 2 minutes

    console.log('Step 1: Navigate to login page');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    console.log('Step 2: Login with test credentials');
    // Fill in login form
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/localhost|savr\.cam/, { timeout: 10000 });

    console.log('Step 3: Navigate to pricing page');
    await page.goto(`${BASE_URL}/pricing`);
    await page.waitForLoadState('networkidle');

    console.log('Step 4: Select a plan (looking for Subscribe or Choose Plan button)');
    // Try to find and click a subscribe/plan button
    // This might vary based on the actual UI, so we try multiple selectors
    const planButtons = [
      'button:has-text("Subscribe")',
      'button:has-text("Choose Plan")',
      'button:has-text("Get Started")',
      'a:has-text("Subscribe")',
      'a:has-text("Choose Plan")'
    ];

    let buttonClicked = false;
    for (const selector of planButtons) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          buttonClicked = true;
          console.log(`Clicked button: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
        continue;
      }
    }

    if (!buttonClicked) {
      console.error('Could not find plan selection button');
      throw new Error('No plan selection button found');
    }

    // Wait for Stripe checkout to load
    await page.waitForTimeout(3000);

    console.log('Step 5: Handle Stripe checkout');
    
    // Check if we're on Stripe checkout page
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    if (currentUrl.includes('checkout.stripe.com')) {
      console.log('On Stripe checkout page, filling out billing info');
      
      // Apply coupon code first if there's a coupon field
      try {
        const promoButton = page.locator('button:has-text("Add promotion code")');
        if (await promoButton.isVisible({ timeout: 5000 })) {
          await promoButton.click();
          await page.waitForTimeout(1000);
          
          const promoInput = page.locator('input[name="discountCode"], input[placeholder*="promotion"], input[placeholder*="coupon"]');
          await promoInput.fill(COUPON_CODE);
          await page.click('button:has-text("Apply")');
          await page.waitForTimeout(2000);
          console.log('Coupon code applied');
        }
      } catch (e) {
        console.log('Coupon field not found or error applying coupon:', e);
      }

      // Fill billing information
      // Stripe forms can vary, so we try to fill available fields
      try {
        // Email (might be pre-filled)
        const emailField = page.locator('input[type="email"]');
        if (await emailField.isVisible({ timeout: 2000 })) {
          await emailField.fill(TEST_EMAIL);
        }

        // Phone
        const phoneField = page.locator('input[name="phone"], input[placeholder*="Phone"]');
        if (await phoneField.isVisible({ timeout: 2000 })) {
          await phoneField.fill(BILLING_INFO.phone);
        }

        // Billing address
        const addressFields = {
          'input[name="billingAddress[line1]"], input[placeholder*="Address"]': BILLING_INFO.address,
          'input[name="billingAddress[city]"], input[placeholder*="City"]': BILLING_INFO.city,
          'input[name="billingAddress[state]"], input[placeholder*="State"]': BILLING_INFO.state,
          'input[name="billingAddress[postalCode]"], input[placeholder*="ZIP"]': BILLING_INFO.zip,
        };

        for (const [selector, value] of Object.entries(addressFields)) {
          try {
            const field = page.locator(selector).first();
            if (await field.isVisible({ timeout: 2000 })) {
              await field.fill(value);
            }
          } catch (e) {
            console.log(`Field not found: ${selector}`);
          }
        }

        // Submit the form
        const submitButton = page.locator('button[type="submit"], button:has-text("Subscribe"), button:has-text("Complete")');
        await submitButton.click();
        console.log('Submitted Stripe checkout form');

      } catch (e) {
        console.error('Error filling Stripe form:', e);
      }
    }

    console.log('Step 6: Wait for redirect back to SAVR');
    // Wait for redirect back to our site
    await page.waitForURL(/localhost|savr\.cam/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    console.log('Step 7: Navigate to settings to check subscription status');
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Wait for subscription data to sync via webhook and onSnapshot
    console.log('Step 8: Waiting for Pro status to appear (webhook + onSnapshot)');
    
    // Wait up to 30 seconds for Pro status to appear
    const proStatusLocator = page.locator('text=/Pro|pro|Premium|premium/i');
    await expect(proStatusLocator).toBeVisible({ timeout: 30000 });

    console.log('✅ Test passed: Pro status is visible!');
    
    // Take a screenshot of the success
    await page.screenshot({ path: '/tmp/subscription-success.png', fullPage: true });
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Take screenshot on failure
    if (test.info().status !== 'passed') {
      await page.screenshot({ 
        path: `/tmp/test-failure-${Date.now()}.png`, 
        fullPage: true 
      });
    }
  });
});
