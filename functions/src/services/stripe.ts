import Stripe from 'stripe';
import { db, admin } from '../utils/firebase';
import type { SubscriptionTierName } from '../types';
import {
  SubscriptionStatus,
  updateUserSubscription,
  upsertUserSubscriptionRecord,
} from '../utils/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build', {
  apiVersion: '2026-01-28.clover',
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely extract the subscription ID from a Stripe Invoice object.
 * In Stripe API >= 2025-xx / stripe-node v20+, `invoice.subscription`
 * was removed in favour of `invoice.parent.subscription_details.subscription`.
 */
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === 'string' ? sub : sub.id;
}

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

    console.warn(`Price ${priceId} missing metadata.tier field - defaulting to 'basic' tier. Please add metadata.tier='basic' or 'pro' in Stripe Dashboard.`);
    return 'basic';
  } catch (error) {
    console.error('Error retrieving price from Stripe:', error);
    return 'basic';
  }
}

/** Resolve a Stripe customer ID from various object shapes. */
function resolveCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

/** Look up the SAVR user by their stored Stripe customer ID. */
async function findUserByCustomerId(customerId: string): Promise<{ userId: string; data: FirebaseFirestore.DocumentData } | null> {
  const snap = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
  if (snap.empty) return null;
  return { userId: snap.docs[0].id, data: snap.docs[0].data() };
}

/** Log a Stripe webhook event to the `stripeEvents` collection for audit/CS. */
async function logStripeEvent(event: Stripe.Event, extra?: Record<string, unknown>): Promise<void> {
  try {
    await db.collection('stripeEvents').add({
      eventId: event.id,
      type: event.type,
      livemode: event.livemode,
      created: new Date(event.created * 1000),
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...extra,
    });
  } catch (err) {
    // Non-critical — don't let logging failure break the webhook.
    console.error('Failed to log Stripe event:', err);
  }
}

// ---------------------------------------------------------------------------
// Webhook router
// ---------------------------------------------------------------------------

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

  // Log every event for audit / customer-service lookups
  await logStripeEvent(event);

  switch (event.type) {
    // ------ Checkout ------
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`⏰ Checkout session expired: ${session.id}`);
      break;
    }
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`✅ Async payment succeeded for checkout session ${session.id}`);
      // Treat the same as checkout.session.completed for delayed payment methods
      await handleCheckoutCompleted(session);
      break;
    }
    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`❌ Async payment failed for checkout session ${session.id}`);
      break;
    }

    // ------ Customer lifecycle ------
    case 'customer.created': {
      const customer = event.data.object as Stripe.Customer;
      console.log(`👤 Stripe customer created: ${customer.id} (${customer.email})`);
      await handleCustomerCreated(customer);
      break;
    }
    case 'customer.updated': {
      const customer = event.data.object as Stripe.Customer;
      console.log(`👤 Stripe customer updated: ${customer.id} (${customer.email})`);
      await handleCustomerUpdated(customer);
      break;
    }
    case 'customer.deleted': {
      const customer = event.data.object as unknown as Stripe.DeletedCustomer;
      console.log(`👤 Stripe customer deleted: ${customer.id}`);
      await handleCustomerDeleted(customer);
      break;
    }

    // ------ Subscription lifecycle ------
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
    case 'customer.subscription.paused': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`⏸️ Subscription paused: ${subscription.id}`);
      await handleSubscriptionPaused(subscription);
      break;
    }
    case 'customer.subscription.resumed': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`▶️ Subscription resumed: ${subscription.id}`);
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case 'customer.subscription.trial_will_end': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleTrialWillEnd(subscription);
      break;
    }
    case 'customer.subscription.pending_update_applied': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`✅ Pending subscription update applied: ${subscription.id}`);
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case 'customer.subscription.pending_update_expired': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`⏰ Pending subscription update expired: ${subscription.id}`);
      break;
    }

    // ------ Invoice events ------
    case 'invoice.created': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`📄 Invoice created: ${invoice.id} (status: ${invoice.status})`);
      await logInvoiceEvent(invoice, 'created');
      break;
    }
    case 'invoice.finalized': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`📄 Invoice finalized: ${invoice.id}`);
      await logInvoiceEvent(invoice, 'finalized');
      break;
    }
    case 'invoice.paid':
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
    case 'invoice.payment_action_required': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`⚠️ Invoice ${invoice.id} requires payment action`);
      await handlePaymentActionRequired(invoice);
      break;
    }
    case 'invoice.upcoming': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`📅 Upcoming invoice for customer ${resolveCustomerId(invoice.customer)}`);
      break;
    }
    case 'invoice.marked_uncollectible': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`❌ Invoice ${invoice.id} marked uncollectible`);
      await handleInvoiceUncollectible(invoice);
      break;
    }
    case 'invoice.voided': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`🗑️ Invoice ${invoice.id} voided`);
      break;
    }

    // ------ Payment Intent events ------
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log(`💳 Payment intent succeeded: ${pi.id} ($${(pi.amount / 100).toFixed(2)})`);
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log(`❌ Payment intent failed: ${pi.id}`);
      break;
    }
    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log(`🚫 Payment intent canceled: ${pi.id}`);
      break;
    }
    case 'payment_intent.requires_action': {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log(`⚠️ Payment intent requires action: ${pi.id}`);
      break;
    }

    // ------ Customer discount events ------
    case 'customer.discount.created':
    case 'customer.discount.updated':
    case 'customer.discount.deleted': {
      console.log(`🏷️ Customer discount event: ${event.type}`);
      break;
    }

    // ------ Subscription schedule events ------
    case 'subscription_schedule.created':
    case 'subscription_schedule.updated':
    case 'subscription_schedule.released':
    case 'subscription_schedule.canceled':
    case 'subscription_schedule.completed':
    case 'subscription_schedule.aborted':
    case 'subscription_schedule.expiring': {
      console.log(`📋 Subscription schedule event: ${event.type}`);
      break;
    }

    default:
      console.log(`ℹ️  Unhandled event type: ${event.type}`);
  }
}

// ---------------------------------------------------------------------------
// Customer handlers
// ---------------------------------------------------------------------------

async function handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
  if (!customer.email) return;

  // Try to link this Stripe customer to an existing SAVR user by email
  const usersSnap = await db.collection('users').where('email', '==', customer.email).limit(1).get();
  if (usersSnap.empty) {
    console.log(`ℹ️  No SAVR user found for email ${customer.email}, Stripe customer ${customer.id} will be linked on checkout.`);
    return;
  }

  const userDoc = usersSnap.docs[0];
  const existing = userDoc.data();

  // Only set if not already linked to a different customer
  if (existing.stripeCustomerId && existing.stripeCustomerId !== customer.id) {
    console.warn(`⚠️  User ${userDoc.id} already linked to Stripe customer ${existing.stripeCustomerId}, skipping link to ${customer.id}`);
    return;
  }

  await db.collection('users').doc(userDoc.id).update({
    stripeCustomerId: customer.id,
    stripeEmail: customer.email,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`✅ Linked Stripe customer ${customer.id} to SAVR user ${userDoc.id}`);
}

async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  const user = await findUserByCustomerId(customer.id);
  if (!user) return;

  // Sync useful customer-level fields for CS visibility
  const updates: Record<string, unknown> = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (customer.email) updates.stripeEmail = customer.email;
  if (customer.name) updates.stripeName = customer.name;

  await db.collection('users').doc(user.userId).update(updates);
  console.log(`✅ Synced Stripe customer update to user ${user.userId}`);
}

async function handleCustomerDeleted(customer: Stripe.DeletedCustomer): Promise<void> {
  const user = await findUserByCustomerId(customer.id);
  if (!user) return;

  // Customer deleted in Stripe — downgrade and clear IDs
  await updateUserSubscription(user.userId, {
    subscriptionTier: 'basic',
    subscriptionStatus: 'cancelled',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  });
  console.log(`✅ Cleared Stripe data for deleted customer ${customer.id}, user ${user.userId}`);
}

// ---------------------------------------------------------------------------
// Checkout handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log(`🔔 Processing checkout.session.completed webhook for session ${session.id}`);

  // Prefer client_reference_id from Pricing Table, while keeping metadata fallback.
  const claimedUserId = session.client_reference_id || session.metadata?.userId;

  if (!claimedUserId) {
    console.error('❌ No user ID found in checkout session - rejecting webhook');
    return;
  }

  console.log(`✅ Checkout session ${session.id} has claimed user ID: ${claimedUserId}`);

  // SECURITY: Validate that the checkout session's customer email matches the user's email
  const userDoc = await db.collection('users').doc(claimedUserId).get();
  if (!userDoc.exists) {
    console.error(`❌ User ${claimedUserId} not found in Firestore - rejecting checkout webhook`);
    return;
  }

  const userData = userDoc.data();
  const userEmail = userData?.email;

  if (!userEmail) {
    console.error(`❌ User ${claimedUserId} has no email in Firestore - rejecting checkout webhook`);
    return;
  }

  // Get the customer email from the Stripe session
  let sessionEmail: string | null = null;
  if (session.customer_details?.email) {
    sessionEmail = session.customer_details.email;
  } else if (session.customer) {
    const custId = resolveCustomerId(session.customer);
    if (custId) {
      const cust = await stripe.customers.retrieve(custId);
      if (cust && !cust.deleted && cust.email) {
        sessionEmail = cust.email;
      }
    }
  }

  if (!sessionEmail) {
    console.error(`❌ No email found in checkout session ${session.id} - rejecting webhook`);
    return;
  }

  // Verify emails match (case-insensitive)
  if (sessionEmail.toLowerCase() !== userEmail.toLowerCase()) {
    console.error(
      `❌ Email mismatch for user ${claimedUserId}: Firestore email '${userEmail}' does not match ` +
      `Stripe session email '${sessionEmail}'. Possible account takeover attempt - rejecting webhook.`
    );
    return;
  }

  console.log(`✅ Email validation passed`);

  const stripeCustomerId = resolveCustomerId(session.customer);

  if (!stripeCustomerId) {
    console.error(`❌ No Stripe customer ID in checkout session ${session.id} - rejecting webhook`);
    return;
  }

  let userId = claimedUserId;

  // Verify against server-trusted customer identity
  if (stripeCustomerId) {
    const existingUser = await findUserByCustomerId(stripeCustomerId);
    if (existingUser) {
      if (userId !== existingUser.userId) {
        console.error(`❌ Checkout user mismatch: claimed ${userId}, mapped ${existingUser.userId}`);
        return;
      }
      userId = existingUser.userId;
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
  let currentPeriodEnd: Date | null = null;
  let cancelAtPeriodEnd = false;

  if (session.subscription) {
    const sub =
      typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : (session.subscription as Stripe.Subscription);

    subscriptionId = sub.id;

    const priceId = sub.items?.data?.[0]?.price?.id;
    if (priceId) {
      tier = await getTierFromPrice(priceId);
    }

    status = mapStripeStatus(sub.status);
    cancelAtPeriodEnd = sub.cancel_at_period_end;
    // In Stripe v20+, current_period_end is removed; use cancel_at as the billing end indicator
    if (sub.cancel_at) {
      currentPeriodEnd = new Date(sub.cancel_at * 1000);
    }

    if (sub.status === 'trialing' && sub.trial_end) {
      trialEnd = new Date(sub.trial_end * 1000);
    }

    console.log(`✅ Sub ${subscriptionId}, tier=${tier}, status=${sub.status}->${status}, cancel_at_period_end=${cancelAtPeriodEnd}`);
  } else {
    console.warn(`⚠️  No subscription found in checkout session ${session.id}`);
  }

  // Persist enriched data for customer service
  await updateUserSubscription(userId, {
    subscriptionTier: tier,
    subscriptionStatus: status,
    stripeCustomerId,
    stripeSubscriptionId: subscriptionId,
    ...(trialEnd ? { trialEndsAt: trialEnd } : {}),
    currentPeriodEnd,
    cancelAtPeriodEnd,
    stripeEmail: sessionEmail,
    lastPaymentDate: new Date(),
  });

  if (subscriptionId) {
    await upsertUserSubscriptionRecord(userId, {
      provider: 'stripe',
      subscriptionId,
      status,
      startDate: new Date(),
      currentPeriodEnd,
      cancelAtPeriodEnd,
      tier,
    });
  }

  console.log(
    `✅ Checkout processed for user ${userId}, email ${userEmail}. ` +
    `Customer: ${stripeCustomerId}, Sub: ${subscriptionId}, Tier: ${tier}, Status: ${status}`
  );
}

// ---------------------------------------------------------------------------
// Subscription handlers
// ---------------------------------------------------------------------------

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log(`🔔 Processing subscription update for ${subscription.id}, status ${subscription.status}`);

  const customerId = resolveCustomerId(subscription.customer);
  if (!customerId) {
    console.error(`❌ No customer ID in subscription event for ${subscription.id}`);
    return;
  }

  const resolvedUser =
    (subscription.metadata?.userId
      ? { userId: subscription.metadata.userId }
      : null) || await findUserByCustomerId(customerId);

  if (!resolvedUser) {
    console.error(`❌ No user found for subscription ${subscription.id}, customer ${customerId}`);
    return;
  }

  const { userId } = resolvedUser;
  const internalStatus = mapStripeStatus(subscription.status);

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = priceId ? await getTierFromPrice(priceId) : 'basic';

  let trialEnd: Date | null = null;
  if (subscription.status === 'trialing' && subscription.trial_end) {
    trialEnd = new Date(subscription.trial_end * 1000);
  }

  const currentPeriodEnd = subscription.cancel_at
    ? new Date(subscription.cancel_at * 1000)
    : null;

  await updateUserSubscription(userId, {
    subscriptionTier: tier,
    subscriptionStatus: internalStatus,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    ...(trialEnd ? { trialEndsAt: trialEnd } : {}),
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  await upsertUserSubscriptionRecord(userId, {
    provider: 'stripe',
    subscriptionId: subscription.id,
    status: internalStatus,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    tier,
  });

  console.log(`✅ Subscription update for user ${userId}: tier=${tier}, status=${internalStatus}, cancel_at_period_end=${subscription.cancel_at_period_end}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log(`🔔 Processing subscription deletion for ${subscription.id}`);

  const customerId = resolveCustomerId(subscription.customer);
  if (!customerId) {
    console.error('❌ No customer ID in subscription deletion event');
    return;
  }

  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error(`❌ No user found for subscription deletion, customer ${customerId}`);
    return;
  }

  await updateUserSubscription(user.userId, {
    subscriptionTier: 'basic',
    subscriptionStatus: 'cancelled',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  });

  await upsertUserSubscriptionRecord(user.userId, {
    provider: 'stripe',
    subscriptionId: subscription.id,
    status: 'cancelled',
    endDate: new Date(),
    tier: 'basic',
  });

  console.log(`✅ Subscription deleted for user ${user.userId}, downgraded to basic`);
}

async function handleSubscriptionPaused(subscription: Stripe.Subscription): Promise<void> {
  const customerId = resolveCustomerId(subscription.customer);
  if (!customerId) return;

  const user = await findUserByCustomerId(customerId);
  if (!user) return;

  // Paused subs should not grant Pro access
  await updateUserSubscription(user.userId, {
    subscriptionTier: 'basic',
    subscriptionStatus: 'paused',
  });

  await upsertUserSubscriptionRecord(user.userId, {
    provider: 'stripe',
    subscriptionId: subscription.id,
    status: 'paused',
  });

  console.log(`✅ Subscription paused for user ${user.userId}, downgraded to basic`);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  console.log(`⏰ Trial ending soon for subscription ${subscription.id} (ends: ${trialEnd?.toISOString()})`);

  const customerId = resolveCustomerId(subscription.customer);
  if (!customerId) return;

  const user = await findUserByCustomerId(customerId);
  if (!user) return;

  // Store the trial end notification for the frontend to optionally display
  await db.collection('users').doc(user.userId).update({
    trialEndingNotified: true,
    trialEndsAt: trialEnd,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ Trial-ending notification stored for user ${user.userId}`);
}

// ---------------------------------------------------------------------------
// Invoice / Payment handlers
// ---------------------------------------------------------------------------

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log(`🔔 Processing payment succeeded for invoice ${invoice.id}`);

  const customerId = resolveCustomerId(invoice.customer);
  if (!customerId) {
    console.error('❌ No customer ID in payment success event');
    return;
  }

  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error(`❌ No user found for payment success, customer ${customerId}`);
    return;
  }

  const { userId } = user;
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);

  // Store payment info for CS reference
  const paymentUpdate: Record<string, unknown> = {
    lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
    lastPaymentStatus: 'succeeded',
    lastInvoiceId: invoice.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (invoice.amount_paid) {
    paymentUpdate.lastPaymentAmount = invoice.amount_paid;
    paymentUpdate.lastPaymentCurrency = invoice.currency;
  }
  await db.collection('users').doc(userId).update(paymentUpdate);

  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const internalStatus = mapStripeStatus(sub.status);
    const tier = sub.items?.data?.[0]?.price?.id
      ? await getTierFromPrice(sub.items.data[0].price.id)
      : undefined;

    await updateUserSubscription(userId, {
      subscriptionStatus: internalStatus,
      ...(tier ? { subscriptionTier: tier } : {}),
      currentPeriodEnd: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
    });

    console.log(`✅ Payment succeeded for user ${userId}, sub ${subscriptionId}, status → ${internalStatus}`);
  } else {
    console.log(`ℹ️  Payment succeeded but no subscription on invoice ${invoice.id}`);
  }

  // Log to invoiceHistory subcollection for complete payment trail
  await logInvoiceEvent(invoice, 'payment_succeeded');
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log(`🔔 Processing payment failed for invoice ${invoice.id}`);

  const customerId = resolveCustomerId(invoice.customer);
  if (!customerId) {
    console.error('❌ No customer ID in payment failure event');
    return;
  }

  const user = await findUserByCustomerId(customerId);
  if (!user) {
    console.error(`❌ No user found for payment failure, customer ${customerId}`);
    return;
  }

  const { userId } = user;

  // Record failure details for CS
  await db.collection('users').doc(userId).update({
    lastPaymentStatus: 'failed',
    lastPaymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastInvoiceId: invoice.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await updateUserSubscription(userId, {
    subscriptionStatus: 'past_due',
  });

  const subscriptionId = getSubscriptionIdFromInvoice(invoice);

  if (subscriptionId) {
    await upsertUserSubscriptionRecord(userId, {
      provider: 'stripe',
      subscriptionId,
      status: 'past_due',
    });
  }

  await logInvoiceEvent(invoice, 'payment_failed');

  console.log(`✅ Payment failure recorded for user ${userId}, sub ${subscriptionId || 'N/A'}`);
}

async function handlePaymentActionRequired(invoice: Stripe.Invoice): Promise<void> {
  const customerId = resolveCustomerId(invoice.customer);
  if (!customerId) return;

  const user = await findUserByCustomerId(customerId);
  if (!user) return;

  await db.collection('users').doc(user.userId).update({
    paymentActionRequired: true,
    lastInvoiceId: invoice.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`⚠️ Payment action required stored for user ${user.userId}`);
}

async function handleInvoiceUncollectible(invoice: Stripe.Invoice): Promise<void> {
  const customerId = resolveCustomerId(invoice.customer);
  if (!customerId) return;

  const user = await findUserByCustomerId(customerId);
  if (!user) return;

  // Downgrade since we can't collect payment
  await updateUserSubscription(user.userId, {
    subscriptionTier: 'basic',
    subscriptionStatus: 'past_due',
  });

  console.log(`❌ Invoice uncollectible for user ${user.userId}, downgraded to basic`);
}

/** Persist invoice events to a subcollection for payment history. */
async function logInvoiceEvent(invoice: Stripe.Invoice, action: string): Promise<void> {
  const customerId = resolveCustomerId(invoice.customer);
  if (!customerId) return;

  const user = await findUserByCustomerId(customerId);
  if (!user) return;

  try {
    await db.collection('users').doc(user.userId).collection('invoiceHistory').add({
      invoiceId: invoice.id,
      action,
      status: invoice.status,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      subscriptionId: getSubscriptionIdFromInvoice(invoice),
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to log invoice event:', err);
  }
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'canceled':
      return 'cancelled';
    case 'paused':
      return 'paused';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'past_due';
    default:
      return 'past_due';
  }
}

// ---------------------------------------------------------------------------
// Billing portal
// ---------------------------------------------------------------------------

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
