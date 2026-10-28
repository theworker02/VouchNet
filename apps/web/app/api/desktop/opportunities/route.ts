import { NextRequest, NextResponse } from 'next/server';
import { desktopActorFromBearer } from '../../../lib/desktop-auth';
import { listOpportunities } from '../../../lib/opportunities';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

/**
 * Desktop opportunities surface for build-in-public work requests. Visibility rules match the web
 * opportunities list for the signed-in device owner.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'desktopRead', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80);
    const remoteOnly = request.nextUrl.searchParams.get('remote') === '1';
    const opportunities = await listOpportunities({
      viewerId: actor.userId,
      q: query.length >= 2 ? query : null,
      remoteOnly,
      limit: 40,
    });
    return NextResponse.json({
      opportunities: opportunities.map((opportunity) => ({
        id: opportunity.id,
        slug: opportunity.slug,
        type: opportunity.type,
        title: opportunity.title,
        summary: opportunity.summary,
        lookingFor: opportunity.lookingFor,
        location: opportunity.location,
        remote: opportunity.remote,
        tags: opportunity.tags,
        budgetMin: opportunity.budgetMin,
        budgetMax: opportunity.budgetMax,
        budgetCurrency: opportunity.budgetCurrency,
        deadline: opportunity.deadline,
        proposalCount: opportunity.proposalCount,
        poster: opportunity.poster,
        project: opportunity.project,
        createdAt:
          opportunity.createdAt instanceof Date
            ? opportunity.createdAt.toISOString()
            : String(opportunity.createdAt),
      })),
    });
  } catch {
    return NextResponse.json({ error: 'OPPORTUNITIES_UNAVAILABLE' }, { status: 503 });
  }
}
