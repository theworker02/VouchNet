import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { publicUrl } from '../../../lib/app-url';
import { actorFromRequest, getPrimaryEmailStatus } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import {
  developerAccessPriceId,
  StripeConfigurationError,
  stripeClient,
} from '../../../lib/stripe';
import { getDeveloperAccessSummary } from '../../../lib/subscription';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const [access, email] = await Promise.all([
      getDeveloperAccessSummary(actor.userId),
      getPrimaryEmailStatus(actor.userId),
    ]);
    if (access.subscriptionId !== null && access.status === 'ACTIVE')
      return NextResponse.json({ error: 'ALREADY_SUBSCRIBED' }, { status: 409 });
    const checkout: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: developerAccessPriceId(), quantity: 1 }],
      client_reference_id: actor.userId,
      metadata: { userId: actor.userId, product: 'vouchnet_developer_access' },
      subscription_data: {
        metadata: { userId: actor.userId, product: 'vouchnet_developer_access' },
      },
      success_url: publicUrl('/settings/developers?billing=success', request.url).toString(),
      cancel_url: publicUrl('/settings/developers?billing=canceled', request.url).toString(),
    };
    if (access.customerId !== null) checkout.customer = access.customerId;
    else if (email !== null) checkout.customer_email = email.email;
    const session = await stripeClient().checkout.sessions.create(checkout);
    if (session.url === null) throw new Error('CHECKOUT_URL_MISSING');
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof StripeConfigurationError
            ? 'DEVELOPER_BILLING_NOT_CONFIGURED'
            : 'CHECKOUT_UNAVAILABLE',
      },
      { status: error instanceof StripeConfigurationError ? 503 : 502 },
    );
  }
}
