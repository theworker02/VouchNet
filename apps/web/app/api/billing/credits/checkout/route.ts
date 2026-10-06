import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { z } from 'zod';
import { creditsForAmountCents, findCreditTopUpPackage } from '../../../../lib/api-credits-config';
import { apiCreditsProduct } from '../../../../lib/api-credits-checkout';
import { publicUrl } from '../../../../lib/app-url';
import { actorFromRequest, getPrimaryEmailStatus } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';
import { StripeConfigurationError, stripeClient, webhookSecret } from '../../../../lib/stripe';
import { getDeveloperAccessSummary, getSubscriptionSummary } from '../../../../lib/subscription';

export const runtime = 'nodejs';

const checkoutRequestSchema = z
  .object({
    packageId: z.string().max(32),
    returnTo: z.enum(['account', 'developers']).default('developers'),
  })
  .strict();

/**
 * Starts a one-time Stripe Checkout payment for a preset credit package. The browser redirect does
 * not grant credits; only the signed checkout.session.completed webhook does.
 */
export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const parsed = checkoutRequestSchema.safeParse(await request.json().catch(() => null));
    const topUp = parsed.success ? findCreditTopUpPackage(parsed.data.packageId) : null;
    if (!parsed.success || topUp === null)
      return NextResponse.json({ error: 'INVALID_CREDIT_PACKAGE' }, { status: 400 });
    // Fail before charging anyone if the webhook that grants credits cannot be verified.
    webhookSecret();
    const [subscription, legacyAccess, email] = await Promise.all([
      getSubscriptionSummary(actor.userId),
      getDeveloperAccessSummary(actor.userId),
      getPrimaryEmailStatus(actor.userId),
    ]);
    const credits = creditsForAmountCents(topUp.amountCents);
    const metadata = {
      userId: actor.userId,
      product: apiCreditsProduct,
      packageId: topUp.id,
      credits: String(credits),
    };
    const returnPath = `/settings/${parsed.data.returnTo}`;
    const checkout: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: topUp.amountCents,
            product_data: {
              name: 'VouchNet API credits',
              description: `${credits.toLocaleString('en-US')} prepaid credits for the VouchNet API and MCP. Credits do not expire.`,
            },
          },
        },
      ],
      client_reference_id: actor.userId,
      metadata,
      payment_intent_data: { metadata },
      success_url: publicUrl(`${returnPath}?credits=success`, request.url).toString(),
      cancel_url: publicUrl(`${returnPath}?credits=canceled`, request.url).toString(),
    };
    const customerId = subscription.customerId ?? legacyAccess.customerId;
    if (customerId !== null) checkout.customer = customerId;
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
