import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { z } from 'zod';
import { actorFromRequest, getPrimaryEmailStatus } from '../../../../../lib/identity';
import { hasSameOrigin } from '../../../../../lib/request-security';
import { publicUrl } from '../../../../../lib/app-url';
import type { StudioPackageId } from '../../../../../lib/studio-config';
import { configuredStudioPriceId } from '../../../../../lib/studio-billing';
import { getStudioRequestForOwner, recordStudioCheckout } from '../../../../../lib/studio';
import { StripeConfigurationError, stripeClient, webhookSecret } from '../../../../../lib/stripe';

export const runtime = 'nodejs';
const idSchema = z.string().uuid();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const requestId = idSchema.parse((await context.params).id);
    const studioRequest = await getStudioRequestForOwner(actor.userId, requestId);
    if (studioRequest === null || studioRequest.stripeCheckoutSessionId !== null)
      return NextResponse.json({ error: 'REQUEST_NOT_PAYABLE' }, { status: 409 });
    if (studioRequest.status !== 'PAYMENT_PENDING' && studioRequest.status !== 'QUOTE_APPROVED')
      return NextResponse.json({ error: 'QUOTE_REQUIRED' }, { status: 409 });
    webhookSecret();
    const email = await getPrimaryEmailStatus(actor.userId);
    const checkout: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      client_reference_id: actor.userId,
      metadata: {
        product: 'vouchnet_studio_deposit',
        studioRequestId: requestId,
        userId: actor.userId,
      },
      payment_intent_data: {
        metadata: {
          product: 'vouchnet_studio_deposit',
          studioRequestId: requestId,
          userId: actor.userId,
        },
      },
      success_url: publicUrl(
        `/studio/projects?payment=success&order=${studioRequest.orderNumber}`,
        request.url,
      ).toString(),
      cancel_url: publicUrl(
        `/studio/request?payment=canceled&request=${requestId}`,
        request.url,
      ).toString(),
    };
    if (studioRequest.packageId === 'CUSTOM') {
      if (studioRequest.depositCents === null || studioRequest.quoteDescription === null)
        return NextResponse.json({ error: 'QUOTE_REQUIRED' }, { status: 409 });
      checkout.line_items = [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: studioRequest.depositCents,
            product_data: {
              name: 'VouchNet Studio custom project deposit',
              description: studioRequest.quoteDescription,
            },
          },
        },
      ];
    } else {
      checkout.line_items = [
        {
          price: configuredStudioPriceId(
            studioRequest.packageId as Exclude<StudioPackageId, 'CUSTOM'>,
          ),
          quantity: 1,
        },
      ];
    }
    if (email !== null) checkout.customer_email = email.email;
    const session = await stripeClient().checkout.sessions.create(checkout);
    if (session.url === null) throw new Error('CHECKOUT_URL_MISSING');
    await recordStudioCheckout(requestId, actor.userId, session);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof StripeConfigurationError ||
          (error instanceof Error && error.message === 'STUDIO_PRICE_NOT_CONFIGURED')
            ? 'BILLING_NOT_CONFIGURED'
            : 'CHECKOUT_UNAVAILABLE',
      },
      { status: 502 },
    );
  }
}
