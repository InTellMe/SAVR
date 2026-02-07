import Stripe from 'stripe';
import { db } from '../utils/firebase';
import type { SubscriptionTierName } from '../types';
import {
  SubscriptionStatus,
  updateUserSubscription,
  upsertUserSubscriptionRecord,
} from '../utils/subscription';

const STRIPE_PRICE_ID_PLUS = process.env.STRIPE_PRICE_ID_PLUS || '';
const STRIPE_PRICE_ID_PREMIUM = process.env.STRIPE_PRICE_ID_PREMIUM || '';

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

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pantrychef.intellmeai.com';

  const resolvedSuccessUrl =
    successUrl || `${appBaseUrl}/dashboard?stripeSuccess=true`;
  const resolvedCancelUrl =
    cancelUrl || `${appBaseUrl}/pricing?stripeCancelled=true`;

  // Create checkout session
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
    success_url: resolvedSuccessUrl,
    cancel_url: resolvedCancelUrl,
    metadata: { userId },
  });

  return session.url || '';
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
  if (!priceId) return 'plus';
  if (priceId === STRIPE_PRICE_ID_PREMIUM) return 'premium';
  if (priceId === STRIPE_PRICE_ID_PLUS) return 'plus';
  return 'plus';
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

  let tier: SubscriptionTierName = 'plus';
  if (session.subscription) {
    const sub =
      typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;
    const priceId = (sub as Stripe.Subscription).items?.data?.[0]?.price?.id;
    tier = tierFromPriceId(priceId);
  }

  await updateUserSubscription(userId, {
    subscriptionTier: tier,
    subscriptionStatus: 'active',
    stripeCustomerId,
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
    const usersSnapshot = await db
      .collection('users')
      .where('stripeCustomerId', '==', subscription.customer)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error('No user found for subscription update');
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    resolvedUserId = userDoc.id;
  }

  await updateUserSubscription(resolvedUserId, {
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
  const subscriptionId =
    typeof (invoice as any).subscription_details?.subscription === 'string'
      ? (invoice as any).subscription_details.subscription
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
