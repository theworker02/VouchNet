import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getPrimaryEmailStatus, actorFromRequest } from '../../../lib/identity';
import { publicUrl } from '../../../lib/app-url';
import { hasSameOrigin } from '../../../lib/request-security';
import { StripeConfigurationError, plusPriceId, stripeClient } from '../../../lib/stripe';
import { getSubscriptionSummary } from '../../../lib/subscription';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const [subscription, email] = await Promise.all([
      getSubscriptionSummary(actor.userId),
      getPrimaryEmailStatus(actor.userId),
    ]);
    if (subscription.status === 'ACTIVE' && subscription.tier === 'PLUS')
      return NextResponse.json({ error: 'ALREADY_SUBSCRIBED' }, { status: 409 });
    const checkout: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: plusPriceId(), quantity: 1 }],
      client_reference_id: actor.userId,
      metadata: { userId: actor.userId, product: 'vouchnet_plus' },
      subscription_data: { metadata: { userId: actor.userId, product: 'vouchnet_plus' } },
      success_url: publicUrl('/settings/account?billing=success', request.url).toString(),
      cancel_url: publicUrl('/settings/account?billing=canceled', request.url).toString(),
    };
    if (subscription.customerId !== null) checkout.customer = subscription.customerId;
    else if (email !== null) checkout.customer_email = email.email;
    const session = await stripeClient().checkout.sessions.create(checkout);
    if (session.url === null) throw new Error('CHECKOUT_URL_MISSING');
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof StripeConfigurationError
            ? 'BILLING_NOT_CONFIGURED'
            : 'CHECKOUT_UNAVAILABLE',
      },
      { status: error instanceof StripeConfigurationError ? 503 : 502 },
    );
  }
}
