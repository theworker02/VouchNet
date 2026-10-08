import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { creditCheckoutSession } from '../../../lib/api-credits';
import { isApiCreditCheckout } from '../../../lib/api-credits-checkout';
import { stripeClient, webhookSecret } from '../../../lib/stripe';
import { stripeEntitlementStatus } from '../../../lib/stripe-entitlement';
import { syncStripeDeveloperAccess, syncStripeSubscription } from '../../../lib/subscription';
import { confirmStudioPayment, deliverStudioPaymentEmails } from '../../../lib/studio';

export const runtime = 'nodejs';

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
    status: stripeEntitlementStatus(subscription),
    currentPeriodEndsAt:
      subscription.items.data[0] === undefined
        ? null
        : new Date(subscription.items.data[0].current_period_end * 1000),
  };
  // Developer Access is retired and grants no capability. Legacy events are still recorded so an
  // existing subscriber's status stays accurate and the settings page can offer cancellation.
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
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (isApiCreditCheckout(session)) {
        // Credits are granted only here, from a signed event, once Stripe reports the payment as
        // paid. The ledger is keyed on the Checkout Session id, so redelivery cannot double-credit.
        await creditCheckoutSession(session);
      } else if (session.metadata?.product === 'vouchnet_studio_deposit') {
        // Both persistence and delivery are retry-safe: Stripe's event id is immutable, while the
        // per-request delivery records retry until an administrator and customer are notified.
        if (await confirmStudioPayment(event.id, session)) {
          const requestId = session.metadata.studioRequestId;
          if (requestId !== undefined) await deliverStudioPaymentEmails(requestId);
        }
      } else if (event.type === 'checkout.session.completed') {
        const subscriptionId = asId(session.subscription);
        if (subscriptionId !== null)
          await syncSubscription(await stripeClient().subscriptions.retrieve(subscriptionId));
      }
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
    // subscription synchronization is idempotent by VouchNet user id and credit top-ups are
    // idempotent by Checkout Session id.
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_FAILED' }, { status: 503 });
  }
}
