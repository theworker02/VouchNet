import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest, revokeOtherSessions } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';
export async function POST(request: NextRequest) {
  try {
    if (!hasSameOrigin(request))
      return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'auth', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    await revokeOtherSessions(actor.userId, actor.sessionId);
    return NextResponse.json({ revoked: true });
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
