import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripeClient, webhookSecret } from '../../../lib/stripe';
import {
  syncStripeDeveloperAccess,
  syncStripeSubscription,
  type SubscriptionSummary,
} from '../../../lib/subscription';

export const runtime = 'nodejs';

function entitlementStatus(status: Stripe.Subscription.Status): SubscriptionSummary['status'] {
  if (status === 'active' || status === 'trialing') return 'ACTIVE';
  if (status === 'past_due' || status === 'unpaid') return 'PAST_DUE';
  if (status === 'canceled') return 'CANCELED';
  return 'EXPIRED';
}

function asId(value: string | { id: string } | null): string | null {
  return typeof value === 'string' ? value : (value?.id ?? null);
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata.userId;
  const customerId = asId(subscription.customer);
  if (userId === undefined || customerId === null) return;
  const payload = {
    userId,
    customerId,
    subscriptionId: subscription.id,
    status: entitlementStatus(subscription.status),
    currentPeriodEndsAt:
      subscription.items.data[0] === undefined
        ? null
        : new Date(subscription.items.data[0].current_period_end * 1000),
  };
  if (subscription.metadata.product === 'vouchnet_developer_access')
    await syncStripeDeveloperAccess(payload);
  else if (subscription.metadata.product === 'vouchnet_plus') await syncStripeSubscription(payload);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (signature === null) return NextResponse.json({ error: 'MISSING_SIGNATURE' }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret(),
    );
  } catch {
    return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 });
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = asId(session.subscription);
      if (subscriptionId !== null)
        await syncSubscription(await stripeClient().subscriptions.retrieve(subscriptionId));
    }
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await syncSubscription(event.data.object as Stripe.Subscription);
    }
    return NextResponse.json({ received: true });
  } catch {
    // Return a retryable failure. Stripe's signed delivery will replay the event safely because
    // subscription synchronization is idempotent by VouchNet user id.
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_FAILED' }, { status: 503 });
  }
}
