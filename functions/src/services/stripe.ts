import Stripe from 'stripe';
import { db } from '../utils/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
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
    success_url: successUrl,
    cancel_url: cancelUrl,
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  
  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  // Update user subscription status
  await db.collection('users').doc(userId).update({
    subscriptionTier: 'pro',
    subscriptionStatus: 'active',
    stripeCustomerId: session.customer,
    updatedAt: new Date(),
  });

  // Create subscription record
  if (session.subscription) {
    await db.collection('subscriptions').doc(userId).set({
      userId,
      stripeSubscriptionId: session.subscription,
      status: 'active',
      startDate: new Date(),
      updatedAt: new Date(),
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  
  if (!userId) {
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
    await userDoc.ref.update({
      subscriptionStatus: subscription.status,
      updatedAt: new Date(),
    });
  } else {
    await db.collection('users').doc(userId).update({
      subscriptionStatus: subscription.status,
      updatedAt: new Date(),
    });
  }

  // Update subscription record
  await db.collection('subscriptions').doc(userId).update({
    status: subscription.status,
    updatedAt: new Date(),
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
  await userDoc.ref.update({
    subscriptionTier: 'free',
    subscriptionStatus: 'cancelled',
    updatedAt: new Date(),
  });

  await db.collection('subscriptions').doc(userDoc.id).update({
    status: 'cancelled',
    endDate: new Date(),
    updatedAt: new Date(),
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
  await userDoc.ref.update({
    subscriptionStatus: 'past_due',
    updatedAt: new Date(),
  });
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
