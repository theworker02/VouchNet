import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import { isDeveloperAccessConfigured, isStripeConfigured } from '../../../lib/stripe';
import {
  getDeveloperAccessSummary,
  getSubscriptionSummary,
  hasDeveloperAccess,
  hasVouchNetPlus,
} from '../../../lib/subscription';

export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const [subscription, isPlus, developerAccess, isDeveloperAccess] = await Promise.all([
      getSubscriptionSummary(actor.userId),
      hasVouchNetPlus(actor.userId),
      getDeveloperAccessSummary(actor.userId),
      hasDeveloperAccess(actor.userId),
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
      developerAccess: {
        isConfigured: isDeveloperAccessConfigured(),
        isActive: isDeveloperAccess,
        status: developerAccess.status,
        canManage: developerAccess.customerId !== null,
      },
    });
  } catch {
    return NextResponse.json({ error: 'BILLING_UNAVAILABLE' }, { status: 503 });
  }
}
