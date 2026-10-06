import { NextRequest, NextResponse } from 'next/server';
import { publicUrl } from '../../../lib/app-url';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { StripeConfigurationError, stripeClient } from '../../../lib/stripe';
import { getDeveloperAccessSummary, getSubscriptionSummary } from '../../../lib/subscription';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const [subscription, legacyAccess] = await Promise.all([
      getSubscriptionSummary(actor.userId),
      getDeveloperAccessSummary(actor.userId),
    ]);
    // A legacy Developer Access subscriber may have no VouchNet+ customer; let them cancel too.
    const customerId = subscription.customerId ?? legacyAccess.customerId;
    if (customerId === null)
      return NextResponse.json({ error: 'NO_BILLING_ACCOUNT' }, { status: 409 });
    const portal = await stripeClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: publicUrl('/settings/account', request.url).toString(),
    });
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof StripeConfigurationError
            ? 'BILLING_NOT_CONFIGURED'
            : 'PORTAL_UNAVAILABLE',
      },
      { status: error instanceof StripeConfigurationError ? 503 : 502 },
    );
  }
}
