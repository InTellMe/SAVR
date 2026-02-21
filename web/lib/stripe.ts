/**
 * Stripe SDK lazy initialization utility
 * 
 * This file provides lazy initialization of the Stripe SDK to prevent
 * build-time errors when environment variables are not available.
 * The Stripe client is only created when first accessed at runtime.
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Get or create a Stripe instance with lazy initialization.
 * This prevents build-time errors when STRIPE_SECRET_KEY is not available.
 * 
 * @throws {Error} If STRIPE_SECRET_KEY is not set at runtime
 * @returns {Stripe} Initialized Stripe instance
 */
export function getStripeInstance(): Stripe {
  // Return cached instance if already created
  if (stripeInstance) {
    return stripeInstance;
  }

  // Validate environment variable at runtime
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. Please set this environment variable in your Vercel project settings.'
    );
  }

  // Create and cache the Stripe instance
  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
  });

  return stripeInstance;
}

/**
 * Helper to check if Stripe is properly configured.
 * Useful for conditional logic or graceful degradation.
 * 
 * @returns {boolean} True if STRIPE_SECRET_KEY is available
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
