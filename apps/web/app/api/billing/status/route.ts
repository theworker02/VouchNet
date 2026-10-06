import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import { isStripeConfigured } from '../../../lib/stripe';
import {
  getDeveloperAccessSummary,
  getSubscriptionSummary,
  hasVouchNetPlus,
} from '../../../lib/subscription';

export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const [subscription, isPlus, legacyDeveloperAccess] = await Promise.all([
      getSubscriptionSummary(actor.userId),
      hasVouchNetPlus(actor.userId),
      getDeveloperAccessSummary(actor.userId),
    ]);
    return NextResponse.json({
      isConfigured: isStripeConfigured(),
      isPlus,
      priceCents: 455,
      subscription: {
        status: subscription.status,
        currentPeriodEndsAt: subscription.currentPeriodEndsAt,
        canManage: subscription.customerId !== null,
      },
      // Retired subscription: reported only so a legacy subscriber can find and cancel it. It
      // grants no API or MCP access; prepaid credits do.
      legacyDeveloperAccess: {
        isActive:
          legacyDeveloperAccess.subscriptionId !== null &&
          legacyDeveloperAccess.status === 'ACTIVE',
        canManage: legacyDeveloperAccess.customerId !== null,
      },
    });
  } catch {
    return NextResponse.json({ error: 'BILLING_UNAVAILABLE' }, { status: 503 });
  }
}
