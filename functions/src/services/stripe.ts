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

  console.log(`🔔 Received Stripe webhook: ${event.type} (event ID: ${event.id})`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`📝 Subscription created: ${subscription.id} (status: ${subscription.status})`);
      await handleSubscriptionUpdated(subscription);
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
    case 'customer.subscription.trial_will_end': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`⏰ Trial will end soon for subscription ${subscription.id} (ends: ${new Date(subscription.trial_end! * 1000).toISOString()})`);
      // Note: No action needed here, just logging for visibility
      // Stripe will automatically attempt to charge when trial ends
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(invoice);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
    default:
      console.log(`ℹ️  Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log(`🔔 Processing checkout.session.completed webhook for session ${session.id}`);

  // Prefer client_reference_id from Pricing Table, while keeping metadata fallback.
  const claimedUserId = session.client_reference_id || session.metadata?.userId;

  // Reject webhook if no user ID is provided
  if (!claimedUserId) {
    console.error('❌ No user ID found in checkout session - rejecting webhook');
    return;
  }

  console.log(`✅ Checkout session ${session.id} has claimed user ID: ${claimedUserId}`);

  // SECURITY: Validate that the checkout session's customer email matches the user's email
  // This prevents account takeover where a malicious user could modify client_reference_id
  // to point to a different user's account before checkout
  const userDoc = await db.collection('users').doc(claimedUserId).get();
  if (!userDoc.exists) {
    console.error(`❌ User ${claimedUserId} not found in Firestore - rejecting checkout webhook`);
    return;
  }

  console.log(`✅ User document found for ${claimedUserId}`);

  const userData = userDoc.data();
  const userEmail = userData?.email;

  if (!userEmail) {
    console.error(`❌ User ${claimedUserId} has no email in Firestore - rejecting checkout webhook`);
    return;
  }

  console.log(`✅ User email from Firestore: ${userEmail}`);

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
    console.error(`❌ No email found in checkout session ${session.id} - rejecting webhook`);
    return;
  }

  console.log(`✅ Session email from Stripe: ${sessionEmail}`);

  // Verify emails match (case-insensitive)
  if (sessionEmail.toLowerCase() !== userEmail.toLowerCase()) {
    console.error(
      `❌ Email mismatch for user ${claimedUserId}: Firestore email '${userEmail}' does not match ` +
      `Stripe session email '${sessionEmail}'. Possible account takeover attempt - rejecting webhook.`
    );
    return;
  }

  console.log(`✅ Email validation passed`);

  // Email validation passed - proceed with subscription update
  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : (session.customer as Stripe.Customer | null)?.id ?? null;

  // CRITICAL: Stripe customer ID is required for billing portal access
  if (!stripeCustomerId) {
    console.error(
      `❌ No Stripe customer ID in checkout session ${session.id} for user ${claimedUserId}. ` +
      `Customer will not be able to access billing portal. Rejecting webhook.`
    );
    return;
  }

  console.log(`✅ Stripe customer ID: ${stripeCustomerId}`);

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
          `❌ Checkout user mismatch for customer ${stripeCustomerId}: claimed ${userId}, mapped ${customerUserId}`
        );
        return;
      }

      userId = customerUserId;
      console.log(`✅ User ID verified against customer ID: ${userId}`);
    }
  }

  if (!userId) {
    console.error('❌ No trusted userId in checkout session');
    return;
  }

  let tier: SubscriptionTierName = 'basic';
  let trialEnd: Date | null = null;
  let status: SubscriptionStatus = 'active';
  let subscriptionId: string | null = null;

  if (session.subscription) {
    const sub =
      typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : (session.subscription as Stripe.Subscription);

    subscriptionId = sub.id;
    console.log(`✅ Subscription ID: ${subscriptionId}`);

    const priceId = sub.items?.data?.[0]?.price?.id;
    if (priceId) {
      tier = await getTierFromPrice(priceId);
      console.log(`✅ Subscription tier: ${tier}`);
    }

    // Preserve the subscription status from Stripe (trialing or active)
    status = mapStripeStatus(sub.status);
    console.log(`✅ Subscription status: ${sub.status} → ${status}`);
    
    // Store trial end date if in trial
    if (sub.status === 'trialing' && sub.trial_end) {
      trialEnd = new Date(sub.trial_end * 1000);
      console.log(`✅ Trial ends at: ${trialEnd.toISOString()}`);
    }
  } else {
    console.warn(`⚠️  No subscription found in checkout session ${session.id}`);
  }

  console.log(`🔄 Updating user document for ${userId}...`);
  await updateUserSubscription(userId, {
    subscriptionTier: tier,
    subscriptionStatus: status,
    stripeCustomerId,
    stripeSubscriptionId: subscriptionId,
    ...(trialEnd ? { trialEndsAt: trialEnd } : {}),
  });

  if (subscriptionId) {
    console.log(`🔄 Updating subscription record for ${userId}...`);
    await upsertUserSubscriptionRecord(userId, {
      provider: 'stripe',
      subscriptionId,
      status: status,
      startDate: new Date(),
    });
  }

  console.log(
    `✅ Successfully processed checkout for user ${userId} with email ${userEmail}. ` +
    `Stripe customer ID: ${stripeCustomerId}, Subscription ID: ${subscriptionId}, Tier: ${tier}, Status: ${status}`
  );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log(`🔔 Processing subscription.updated for subscription ${subscription.id}, status ${subscription.status}`);
  
  const userId = subscription.metadata?.userId;

  const internalStatus = mapStripeStatus(subscription.status);

  let resolvedUserId = userId;

  // Extract customer ID from subscription
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer as Stripe.Customer)?.id;

  if (!customerId) {
    console.error(`❌ No customer ID in subscription update event for subscription ${subscription.id}`);
    return;
  }

  console.log(`✅ Customer ID: ${customerId}`);

  if (!resolvedUserId) {
    // Try to find user by customer ID
    console.log(`🔍 Looking up user by customer ID ${customerId}...`);
    const usersSnapshot = await db
      .collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error(`❌ No user found for subscription update with customer ID ${customerId}`);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    resolvedUserId = userDoc.id;
    console.log(`✅ Found user ${resolvedUserId} for customer ${customerId}`);
  }

  // Determine the tier from the current price on the subscription
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = priceId ? await getTierFromPrice(priceId) : 'basic';

  console.log(`✅ Subscription tier: ${tier}, status: ${subscription.status} → ${internalStatus}`);

  // Store trial end date if in trial
  let trialEnd: Date | null = null;
  if (subscription.status === 'trialing' && subscription.trial_end) {
    trialEnd = new Date(subscription.trial_end * 1000);
    console.log(`✅ Trial ends at: ${trialEnd.toISOString()}`);
  }

  // Update user subscription including customer ID and subscription ID
  console.log(`🔄 Updating user document for ${resolvedUserId}...`);
  await updateUserSubscription(resolvedUserId, {
    subscriptionTier: tier,
    subscriptionStatus: internalStatus,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    ...(trialEnd ? { trialEndsAt: trialEnd } : {}),
  });

  console.log(`🔄 Updating subscription record for ${resolvedUserId}...`);
  await upsertUserSubscriptionRecord(resolvedUserId, {
    provider: 'stripe',
    subscriptionId: subscription.id,
    status: internalStatus,
  });

  console.log(
    `✅ Successfully processed subscription update for user ${resolvedUserId}. ` +
    `Stripe customer ID: ${customerId}, Subscription ID: ${subscription.id}, Status: ${internalStatus}, Tier: ${tier}`
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log(`🔔 Processing subscription deletion for subscription ${subscription.id}`);
  
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer as Stripe.Customer)?.id;

  if (!customerId) {
    console.error('❌ No customer ID in subscription deletion event');
    return;
  }

  console.log(`✅ Customer ID: ${customerId}`);

  const usersSnapshot = await db
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  
  if (usersSnapshot.empty) {
    console.error(`❌ No user found for subscription deletion with customer ID ${customerId}`);
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const userId = userDoc.id;

  console.log(`✅ Found user ${userId} for customer ${customerId}`);
  console.log(`🔄 Marking subscription as cancelled...`);

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

  console.log(
    `✅ Successfully processed subscription deletion for user ${userId}. ` +
    `Stripe customer ID: ${customerId}, Subscription ID: ${subscription.id}`
  );
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log(`🔔 Processing payment succeeded for invoice ${invoice.id}`);
  
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer as Stripe.Customer | Stripe.DeletedCustomer)?.id;

  if (!customerId) {
    console.error('❌ No customer ID in payment success event');
    return;
  }

  console.log(`✅ Customer ID: ${customerId}`);

  const usersSnapshot = await db
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  
  if (usersSnapshot.empty) {
    console.error(`❌ No user found for payment success with customer ID ${customerId}`);
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const userId = userDoc.id;

  console.log(`✅ Found user ${userId} for customer ${customerId}`);

  // If this is the first payment after a trial, the subscription should already be 'active'
  // This event is primarily for logging and confirmation
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  
  if (subscriptionId) {
    console.log(`💰 First payment succeeded for subscription ${subscriptionId}`);
    // Fetch the subscription to get its current status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const internalStatus = mapStripeStatus(subscription.status);
    
    console.log(`🔄 Updating user status after successful payment...`);
    await updateUserSubscription(userId, {
      subscriptionStatus: internalStatus,
    });
    
    console.log(`✅ Successfully processed payment success for user ${userId}`);
  } else {
    console.log(`ℹ️  Payment succeeded but no subscription attached to invoice ${invoice.id}`);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log(`🔔 Processing payment failed for invoice ${invoice.id}`);
  
  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer as Stripe.Customer | Stripe.DeletedCustomer)?.id;

  if (!customerId) {
    console.error('❌ No customer ID in payment failure event');
    return;
  }

  console.log(`✅ Customer ID: ${customerId}`);

  const usersSnapshot = await db
    .collection('users')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  
  if (usersSnapshot.empty) {
    console.error(`❌ No user found for payment failure with customer ID ${customerId}`);
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const userId = userDoc.id;

  console.log(`✅ Found user ${userId} for customer ${customerId}`);
  console.log(`🔄 Marking subscription as past_due...`);

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
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : (typeof invoiceWithDetails.subscription_details?.subscription === 'string'
          ? invoiceWithDetails.subscription_details.subscription
          : null);

  if (subscriptionId) {
    console.log(`🔄 Updating subscription record with past_due status...`);
    await upsertUserSubscriptionRecord(userId, {
      provider: 'stripe',
      subscriptionId: subscriptionId,
      status: 'past_due',
    });
  }

  console.log(
    `✅ Successfully processed payment failure for user ${userId}. ` +
    `Stripe customer ID: ${customerId}, Subscription ID: ${subscriptionId || 'N/A'}`
  );
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
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
