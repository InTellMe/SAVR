import Stripe from 'stripe';
import { db } from '../utils/firebase';
import type { SubscriptionTierName } from '../types';
import {
  SubscriptionStatus,
  updateUserSubscription,
  upsertUserSubscriptionRecord,
} from '../utils/subscription';

const STRIPE_PRICE_ID_BASIC_MONTHLY = process.env.STRIPE_PRICE_ID_BASIC_MONTHLY || '';
const STRIPE_PRICE_ID_BASIC_YEARLY = process.env.STRIPE_PRICE_ID_BASIC_YEARLY || '';
const STRIPE_PRICE_ID_PRO_MONTHLY = process.env.STRIPE_PRICE_ID_PRO_MONTHLY || '';
const STRIPE_PRICE_ID_PRO_YEARLY = process.env.STRIPE_PRICE_ID_PRO_YEARLY || '';

const ALL_KNOWN_PRICE_IDS = new Set([
  STRIPE_PRICE_ID_BASIC_MONTHLY,
  STRIPE_PRICE_ID_BASIC_YEARLY,
  STRIPE_PRICE_ID_PRO_MONTHLY,
  STRIPE_PRICE_ID_PRO_YEARLY,
].filter(Boolean));

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
  apiVersion: '2026-01-28.clover',
});

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<string> {
  // Get or create Stripe customer
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();

  let customerId = userData?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData?.email,
      metadata: { userId },
    });
    customerId = customer.id;

    // Save customer ID
    await db.collection('users').doc(userId).update({
      stripeCustomerId: customerId,
    });
  }

  // Check for an existing active subscription on this customer.
  // If one exists, the user should use changeSubscription() instead to avoid duplicates.
  const existingSubs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });
  const trialingSubs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'trialing',
    limit: 1,
  });
  if (existingSubs.data.length > 0 || trialingSubs.data.length > 0) {
    throw new Error(
      'You already have an active subscription. Please use the upgrade/downgrade option or manage your subscription from Settings.'
    );
  }

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pantrychef.intellmeai.com';

  const resolvedSuccessUrl =
    successUrl || `${appBaseUrl}/dashboard?stripeSuccess=true`;
  const resolvedCancelUrl =
    cancelUrl || `${appBaseUrl}/pricing?stripeCancelled=true`;

  // Create checkout session with 5-day free trial
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 5,
      metadata: { userId },
    },
    allow_promotion_codes: true,
    payment_method_collection: 'if_required',
    success_url: resolvedSuccessUrl,
    cancel_url: resolvedCancelUrl,
    metadata: { userId },
  });

  return session.url || '';
}

/**
 * Change an existing subscription to a different price/plan.
 * Uses Stripe's proration to handle billing fairly.
 * This prevents duplicate subscriptions when upgrading or downgrading.
 */
export async function changeSubscription(
  userId: string,
  newPriceId: string
): Promise<{ subscriptionId: string; tier: SubscriptionTierName }> {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();

  if (!userData?.stripeCustomerId) {
    throw new Error('No Stripe customer found. Please subscribe first.');
  }

  // Find the user's current active or trialing subscription
  const activeSubs = await stripe.subscriptions.list({
    customer: userData.stripeCustomerId,
    status: 'active',
    limit: 5,
  });
  const trialSubs = await stripe.subscriptions.list({
    customer: userData.stripeCustomerId,
    status: 'trialing',
    limit: 5,
  });
  const allSubs = [...activeSubs.data, ...trialSubs.data];

  // Find the subscription that matches one of our known price IDs
  let currentSub: Stripe.Subscription | null = null;
  for (const sub of allSubs) {
    const subPriceId = sub.items.data[0]?.price?.id;
    if (subPriceId && ALL_KNOWN_PRICE_IDS.has(subPriceId)) {
      currentSub = sub;
      break;
    }
  }

  if (!currentSub) {
    throw new Error('No active subscription found to change.');
  }

  const currentPriceId = currentSub.items.data[0]?.price?.id;
  if (currentPriceId === newPriceId) {
    throw new Error('You are already on this plan.');
  }

  const newTier = tierFromPriceId(newPriceId);

  // Update the subscription in-place: swap the price on the existing subscription item.
  // Stripe automatically prorates the charge.
  const updated = await stripe.subscriptions.update(currentSub.id, {
    items: [
      {
        id: currentSub.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: { userId },
  });

  // Immediately update Firestore so the user sees the change
  await updateUserSubscription(userId, {
    subscriptionTier: newTier,
    subscriptionStatus: mapStripeStatus(updated.status),
  });

  await upsertUserSubscriptionRecord(userId, {
    provider: 'stripe',
    subscriptionId: updated.id,
    status: mapStripeStatus(updated.status),
  });

  return { subscriptionId: updated.id, tier: newTier };
}

export async function handleStripeWebhook(
  rawBody: string,
  signature: string
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('Stripe webhook secret not configured');
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
  }
}

function tierFromPriceId(priceId: string | undefined): SubscriptionTierName {
  if (!priceId) return 'basic';
  if (priceId === STRIPE_PRICE_ID_PRO_MONTHLY || priceId === STRIPE_PRICE_ID_PRO_YEARLY) return 'pro';
  if (priceId === STRIPE_PRICE_ID_BASIC_MONTHLY || priceId === STRIPE_PRICE_ID_BASIC_YEARLY) return 'basic';
  return 'basic'; // default to basic for unknown price IDs
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;

  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : (session.customer as Stripe.Customer | null)?.id ?? null;

  // Retrieve the subscription once and derive tier + status from it
  let tier: SubscriptionTierName = 'basic';
  let trialEnd: Date | null = null;

  if (session.subscription) {
    const sub =
      typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : (session.subscription as Stripe.Subscription);

    const priceId = sub.items?.data?.[0]?.price?.id;
    tier = tierFromPriceId(priceId);

    // Grant full access during trial (treat 'trialing' as 'active')
    if (sub.status === 'trialing' && sub.trial_end) {
      trialEnd = new Date(sub.trial_end * 1000);
    }
  }

  await updateUserSubscription(userId, {
    subscriptionTier: tier,
    subscriptionStatus: 'active',
    stripeCustomerId,
    ...(trialEnd ? { trialEndsAt: trialEnd } : {}),
  });

  if (session.subscription) {
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as Stripe.Subscription).id;

    await upsertUserSubscriptionRecord(userId, {
      provider: 'stripe',
      subscriptionId,
      status: 'active',
      startDate: new Date(),
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;

  const internalStatus = mapStripeStatus(subscription.status);

  let resolvedUserId = userId;

  if (!resolvedUserId) {
    // Try to find user by customer ID
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as Stripe.Customer)?.id;

    const usersSnapshot = await db
      .collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error('No user found for subscription update');
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    resolvedUserId = userDoc.id;
  }

  // Determine the tier from the current price on the subscription.
  // This is CRITICAL for upgrades/downgrades — without it, the tier never changes.
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = tierFromPriceId(priceId);

  await updateUserSubscription(resolvedUserId, {
    subscriptionTier: tier,
    subscriptionStatus: internalStatus,
  });

  await upsertUserSubscriptionRecord(resolvedUserId, {
    provider: 'stripe',
    subscriptionId: subscription.id,
    status: internalStatus,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const usersSnapshot = await db
    .collection('users')
    .where('stripeCustomerId', '==', subscription.customer)
    .limit(1)
    .get();
  
  if (usersSnapshot.empty) {
    console.error('No user found for subscription deletion');
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const userId = userDoc.id;

  await updateUserSubscription(userId, {
    subscriptionTier: 'basic',
    subscriptionStatus: 'cancelled',
  });

  await upsertUserSubscriptionRecord(userId, {
    provider: 'stripe',
    subscriptionId: subscription.id,
    status: 'cancelled',
    endDate: new Date(),
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const usersSnapshot = await db
    .collection('users')
    .where('stripeCustomerId', '==', invoice.customer)
    .limit(1)
    .get();
  
  if (usersSnapshot.empty) {
    console.error('No user found for payment failure');
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const userId = userDoc.id;

  await updateUserSubscription(userId, {
    subscriptionStatus: 'past_due',
  });

  // Extract subscription ID safely
  // Note: Stripe API changed - subscription_details is the new structure
  // as of Stripe API 2024-11+. Using type assertion until @stripe/stripe-js types are updated.
  // See: https://stripe.com/docs/api/invoices/object#invoice_object-subscription_details
  interface InvoiceWithSubscriptionDetails extends Stripe.Invoice {
    subscription_details?: {
      subscription?: string;
    };
  }
  const invoiceWithDetails = invoice as InvoiceWithSubscriptionDetails;
  const subscriptionId =
    typeof invoiceWithDetails.subscription_details?.subscription === 'string'
      ? invoiceWithDetails.subscription_details.subscription
      : null;

  await upsertUserSubscriptionRecord(userId, {
    provider: 'stripe',
    subscriptionId: subscriptionId ?? undefined,
    status: 'past_due',
  });
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
      return 'cancelled';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'past_due';
    default:
      return 'past_due';
  }
}

export async function createPortalSession(
  userId: string,
  returnUrl: string
): Promise<string> {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  if (!userData?.stripeCustomerId) {
    throw new Error('No Stripe customer ID found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: userData.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}
