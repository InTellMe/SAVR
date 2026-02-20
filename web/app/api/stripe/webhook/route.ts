import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`🔔 Received Stripe webhook: ${event.type} (event ID: ${event.id})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.resumed':
      case 'customer.subscription.pending_update_applied': {
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
        await handleSubscriptionPaused(subscription);
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.paid': {
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// Helper functions

async function findUserByCustomerId(customerId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !data) {
    // Fallback: try to find by customer email
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer && !customer.deleted && customer.email) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', customer.email)
          .single();

        if (userData) {
          // Link the customer ID
          await supabaseAdmin
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', userData.id);
          return userData.id;
        }
      }
    } catch (err) {
      console.error('Error in customer email fallback:', err);
    }
    return null;
  }

  return data.id;
}

async function getTierFromPrice(priceId: string): Promise<'basic' | 'pro'> {
  try {
    const price = await stripe.prices.retrieve(priceId);

    if (price.metadata?.tier) {
      const tier = price.metadata.tier.toLowerCase();
      if (tier === 'pro' || tier === 'plus' || tier === 'premium') return 'pro';
      if (tier === 'basic' || tier === 'free') return 'basic';
    }

    const priceAmount = typeof price.unit_amount === 'number' ? price.unit_amount : 0;
    if (priceAmount > 0) {
      return 'pro'; // Non-zero price defaults to pro
    }

    return 'basic';
  } catch (error) {
    console.error('Error retrieving price:', error);
    return 'basic';
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`Processing checkout.session.completed for ${session.id}`);

  const userId = session.client_reference_id || session.metadata?.userId;
  if (!userId) {
    console.error('No user ID in checkout session');
    return;
  }

  // Verify user exists and email matches
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (!user) {
    console.error(`User ${userId} not found`);
    return;
  }

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  const updates: any = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    updated_at: new Date().toISOString(),
  };

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    if (priceId) {
      updates.subscription_tier = await getTierFromPrice(priceId);
    }
    updates.subscription_status = subscription.status;
  }

  await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId);

  console.log(`✅ Linked checkout to user ${userId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const userId = await findUserByCustomerId(customerId!);

  if (!userId) {
    console.error(`No user found for customer ${customerId}`);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? await getTierFromPrice(priceId) : 'basic';

  const periodEnd = subscription.items?.data?.[0]?.current_period_end;
  const trialEnd = subscription.trial_end;

  await supabaseAdmin
    .from('users')
    .update({
      subscription_tier: tier,
      subscription_status: subscription.status,
      stripe_subscription_id: subscription.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      trial_ends_at: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  console.log(`✅ Updated subscription for user ${userId}: ${subscription.status}, tier ${tier}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const userId = await findUserByCustomerId(customerId!);

  if (!userId) return;

  await supabaseAdmin
    .from('users')
    .update({
      subscription_tier: 'basic',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  console.log(`✅ Subscription deleted for user ${userId}`);
}

async function handleSubscriptionPaused(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const userId = await findUserByCustomerId(customerId!);

  if (!userId) return;

  await supabaseAdmin
    .from('users')
    .update({
      subscription_status: 'paused',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  console.log(`✅ Subscription paused for user ${userId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const userId = await findUserByCustomerId(customerId!);

  if (!userId) return;

  await supabaseAdmin
    .from('users')
    .update({
      last_payment_status: 'succeeded',
      last_payment_date: new Date(invoice.created * 1000).toISOString(),
      payment_action_required: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  console.log(`✅ Payment succeeded for user ${userId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const userId = await findUserByCustomerId(customerId!);

  if (!userId) return;

  await supabaseAdmin
    .from('users')
    .update({
      subscription_status: 'past_due',
      last_payment_status: 'failed',
      last_payment_date: new Date(invoice.created * 1000).toISOString(),
      payment_action_required: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  console.log(`❌ Payment failed for user ${userId}`);
}
