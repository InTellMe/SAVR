import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authenticateRequest } from '@/lib/middleware';
import { getStripeInstance } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  let stripe: Stripe;

  // Initialize Stripe at runtime
  try {
    stripe = getStripeInstance();
  } catch (error) {
    console.error('Stripe configuration error:', error);
    return NextResponse.json(
      { error: 'Payment service configuration error' },
      { status: 500 }
    );
  }

  try {
    // Authenticate the user
    const auth = await authenticateRequest(request);
    if (auth.error) return auth.error;
    
    const { user, supabase } = auth;
    
    // Get the customer ID from the user's profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    if (!userProfile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 400 }
      );
    }

    // Create a portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userProfile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin')}/settings`,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
