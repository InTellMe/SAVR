import { updateUserSubscription, upsertUserSubscriptionRecord, SubscriptionStatus } from '../utils/subscription';

const PAYPAL_ENV = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
const PAYPAL_API_BASE =
  PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

interface PayPalEvent {
  id: string;
  event_type: string;
  resource: any;
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId =
    process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to obtain PayPal access token: ${response.status} ${text}`
    );
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export async function createPayPalSubscription(
  userId: string,
  planId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const accessToken = await getPayPalAccessToken();

  const body = {
    plan_id: planId,
    custom_id: userId,
    application_context: {
      brand_name: 'Pantry Chef',
      user_action: 'SUBSCRIBE_NOW',
      return_url: successUrl,
      cancel_url: cancelUrl,
    },
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to create PayPal subscription: ${response.status} ${text}`
    );
  }

  const data = (await response.json()) as {
    id: string;
    links?: Array<{ rel: string; href: string }>;
  };

  const approvalLink = data.links?.find((link) => link.rel === 'approve')?.href;

  if (!approvalLink) {
    throw new Error('No approval link returned from PayPal');
  }

  return approvalLink;
}

export async function handlePayPalWebhook(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>
): Promise<void> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    throw new Error('PayPal webhook ID not configured');
  }

  const event = JSON.parse(rawBody) as PayPalEvent;

  const transmissionId = headerToString(headers['paypal-transmission-id']);
  const transmissionTime = headerToString(headers['paypal-transmission-time']);
  const certUrl = headerToString(headers['paypal-cert-url']);
  const authAlgo = headerToString(headers['paypal-auth-algo']);
  const transmissionSig = headerToString(headers['paypal-transmission-sig']);

  if (
    !transmissionId ||
    !transmissionTime ||
    !certUrl ||
    !authAlgo ||
    !transmissionSig
  ) {
    throw new Error('Missing PayPal webhook verification headers');
  }

  const accessToken = await getPayPalAccessToken();

  const verifyResponse = await fetch(
    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: event,
      }),
    }
  );

  if (!verifyResponse.ok) {
    const text = await verifyResponse.text();
    throw new Error(
      `Failed to verify PayPal webhook signature: ${verifyResponse.status} ${text}`
    );
  }

  const verifyData = (await verifyResponse.json()) as {
    verification_status?: string;
  };

  if (verifyData.verification_status !== 'SUCCESS') {
    throw new Error(
      `Invalid PayPal webhook signature: ${verifyData.verification_status}`
    );
  }

  await handlePayPalEvent(event);
}

async function handlePayPalEvent(event: PayPalEvent): Promise<void> {
  const resource = event.resource || {};
  const subscriptionId: string | undefined = resource.id;
  const userId: string | undefined = resource.custom_id;

  if (!userId) {
    console.error('PayPal webhook event missing custom_id user reference');
    return;
  }

  switch (event.event_type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'BILLING.SUBSCRIPTION.RE-ACTIVATED': {
      const status: SubscriptionStatus = 'active';

      await updateUserSubscription(userId, {
        subscriptionTier: 'pro',
        subscriptionStatus: status,
        paypalSubscriptionId: subscriptionId ?? null,
      });

      await upsertUserSubscriptionRecord(userId, {
        provider: 'paypal',
        subscriptionId: subscriptionId ?? null,
        status,
        startDate: new Date(),
      });
      break;
    }
    case 'BILLING.SUBSCRIPTION.CANCELLED': {
      const status: SubscriptionStatus = 'cancelled';

      await updateUserSubscription(userId, {
        subscriptionTier: 'free',
        subscriptionStatus: status,
        paypalSubscriptionId: subscriptionId ?? null,
      });

      await upsertUserSubscriptionRecord(userId, {
        provider: 'paypal',
        subscriptionId: subscriptionId ?? null,
        status,
        endDate: new Date(),
      });
      break;
    }
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
    case 'PAYMENT.SALE.DENIED': {
      const status: SubscriptionStatus = 'past_due';

      await updateUserSubscription(userId, {
        subscriptionStatus: status,
        paypalSubscriptionId: subscriptionId ?? null,
      });

      await upsertUserSubscriptionRecord(userId, {
        provider: 'paypal',
        subscriptionId: subscriptionId ?? null,
        status,
      });
      break;
    }
    default: {
      // For unhandled events, just log and move on.
      console.log(`Unhandled PayPal event type: ${event.event_type}`);
    }
  }
}

function headerToString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

