import Stripe from 'stripe';
import { db } from '../utils/firebase';
import type { SubscriptionTierName } from '../types';
import {
  SubscriptionStatus,
  updateUserSubscription,
  upsertUserSubscriptionRecord,
} from '../utils/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
  apiVersion: '2026-01-28.clover',
});

/**
 * Retrieves the subscription tier from a Stripe Price object.
 * Checks the price's metadata.tier field or nickname for tier information.
 */
async function getTierFromPrice(priceId: string): Promise<SubscriptionTierName> {
  try {
    const price = await stripe.prices.retrieve(priceId);
    
    // Check metadata first (recommended approach)
    if (price.metadata?.tier) {
      const tier = price.metadata.tier.toLowerCase();
      if (tier === 'pro' || tier === 'plus' || tier === 'premium') return 'pro';
      if (tier === 'basic' || tier === 'free') return 'basic';
    }
    
    // Check nickname as fallback
    if (price.nickname) {
      const nickname = price.nickname.toLowerCase();
      if (nickname.includes('pro') || nickname.includes('plus') || nickname.includes('premium')) {
        return 'pro';
      }
    }
    
    // Default to basic if no metadata found
    console.warn(`Price ${priceId} missing metadata.tier field - defaulting to 'basic' tier. Please add metadata.tier='basic' or 'pro' in Stripe Dashboard.`);
    return 'basic';
  } catch (error) {
    console.error('Error retrieving price from Stripe:', error);
    return 'basic';
  }
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // Prefer client_reference_id from Pricing Table, while keeping metadata fallback.
  const claimedUserId = session.client_reference_id || session.metadata?.userId;

  // SECURITY: Validate that the checkout session's customer email matches the user's email
  // This prevents account takeover where a malicious user could modify client_reference_id
  // to point to a different user's account before checkout
  const userDoc = await db.collection('users').doc(claimedUserId).get();
  if (!userDoc.exists) {
    console.error(`User ${claimedUserId} not found in Firestore - rejecting checkout webhook`);
    return;
  }

  const userData = userDoc.data();
  const userEmail = userData?.email;

  if (!userEmail) {
    console.error(`User ${claimedUserId} has no email in Firestore - rejecting checkout webhook`);
    return;
  }

  // Get the customer email from the Stripe session
  let sessionEmail: string | null = null;
  if (session.customer_details?.email) {
    sessionEmail = session.customer_details.email;
  } else if (session.customer) {
    // If customer_details.email is not available, retrieve from customer object
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted && customer.email) {
      sessionEmail = customer.email;
    }
  }

  if (!sessionEmail) {
    console.error(`No email found in checkout session ${session.id} - rejecting webhook`);
    return;
  }

  // Verify emails match (case-insensitive)
  if (sessionEmail.toLowerCase() !== userEmail.toLowerCase()) {
    console.error(
      `Email mismatch for user ${claimedUserId}: Firestore email '${userEmail}' does not match ` +
      `Stripe session email '${sessionEmail}'. Possible account takeover attempt - rejecting webhook.`
    );
    return;
  }

  // Email validation passed - proceed with subscription update
  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : (session.customer as Stripe.Customer | null)?.id ?? null;

  let userId = claimedUserId;

  // Never trust client-provided user IDs alone; verify against server-trusted customer identity.
  if (stripeCustomerId) {
    const usersSnapshot = await db
      .collection('users')
      .where('stripeCustomerId', '==', stripeCustomerId)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      const customerUserId = usersSnapshot.docs[0].id;

      if (userId && userId !== customerUserId) {
        console.error(
          `Checkout user mismatch for customer ${stripeCustomerId}: claimed ${userId}, mapped ${customerUserId}`
        );
        return;
      }

      userId = customerUserId;
    }
  }

  if (!userId) {
    console.error('No trusted userId in checkout session');
    return;
  }

  let tier: SubscriptionTierName = 'basic';
  let trialEnd: Date | null = null;

  if (session.subscription) {
    const sub =
      typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : (session.subscription as Stripe.Subscription);

    const priceId = sub.items?.data?.[0]?.price?.id;
    if (priceId) {
      tier = await getTierFromPrice(priceId);
    }

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

  console.log(`Successfully processed checkout for user ${userId} with email ${userEmail}`);
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

  // Determine the tier from the current price on the subscription
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = priceId ? await getTierFromPrice(priceId) : 'basic';

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
