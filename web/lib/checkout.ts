/**
 * Checkout intent tracking utilities for Stripe integration
 * 
 * The Stripe Pricing Table redirects users after checkout without including
 * ?stripeSuccess=true in the URL. These utilities help detect when users
 * return from Stripe Checkout and grant them a grace period while webhooks process.
 */

const CHECKOUT_GRACE_PERIOD_MS = 10 * 60 * 1000; // 10 minutes
const CHECKOUT_FLAG_KEY = 'savr_checkout_pending';

/**
 * Check if user recently initiated a Stripe checkout (localStorage fallback).
 */
export function hasRecentCheckoutIntent(): boolean {
  try {
    const pending = localStorage.getItem(CHECKOUT_FLAG_KEY);
    if (!pending) return false;
    
    const timestamp = parseInt(pending, 10);
    const now = Date.now();
    
    // Reject future timestamps to prevent manipulation
    if (timestamp > now) return false;
    
    const elapsed = now - timestamp;
    return elapsed >= 0 && elapsed < CHECKOUT_GRACE_PERIOD_MS;
  } catch {
    return false;
  }
}

/**
 * Clear the checkout intent flag from localStorage.
 */
export function clearCheckoutIntent(): void {
  try {
    localStorage.removeItem(CHECKOUT_FLAG_KEY);
  } catch {
    // localStorage unavailable — non-critical
  }
}

/**
 * Detect if the user is returning from Stripe Checkout by checking the referrer.
 * This is more reliable than setting the flag on the pricing page before checkout.
 * 
 * @returns true if the referrer is from checkout.stripe.com
 */
export function isReturningFromStripeCheckout(): boolean {
  try {
    const referrer = document.referrer;
    if (!referrer) return false;

    // Parse the URL and check the hostname to prevent spoofing
    const referrerUrl = new URL(referrer);
    return referrerUrl.hostname === 'checkout.stripe.com';
  } catch {
    // Invalid URL or referrer unavailable
    return false;
  }
}

/**
 * Set the checkout intent flag if the user is returning from Stripe Checkout.
 * This should be called early in the page lifecycle on potential landing pages.
 */
export function trackCheckoutIntentIfReturning(): void {
  if (isReturningFromStripeCheckout()) {
    try {
      localStorage.setItem(CHECKOUT_FLAG_KEY, Date.now().toString());
    } catch {
      // localStorage unavailable (private browsing, etc.) — non-critical
    }
  }
}
