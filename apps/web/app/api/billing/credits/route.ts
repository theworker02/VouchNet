import { NextRequest, NextResponse } from 'next/server';
import { getCreditOverview } from '../../../lib/api-credits';
import { actorFromRequest } from '../../../lib/identity';
import { isApiCreditsConfigured } from '../../../lib/stripe';

export const runtime = 'nodejs';

/** The signed-in member's prepaid API credit balance, recent ledger activity, and price list. */
export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const overview = await getCreditOverview(actor.userId);
    return NextResponse.json(
      { isConfigured: isApiCreditsConfigured(), ...overview },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'CREDITS_UNAVAILABLE' }, { status: 503 });
  }
}
