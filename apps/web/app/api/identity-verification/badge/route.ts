import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import { setVerificationBadgeVisible } from '../../../lib/identity-verification';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }
  const visible =
    typeof body === 'object' && body !== null && 'visible' in body
      ? (body as { visible: unknown }).visible
      : undefined;
  if (typeof visible !== 'boolean')
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  try {
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    if (!(await setVerificationBadgeVisible(actor.userId, visible)))
      return NextResponse.json({ error: 'NOT_VERIFIED' }, { status: 409 });
    return NextResponse.json({ badgeVisible: visible });
  } catch {
    return NextResponse.json({ error: 'BADGE_UPDATE_FAILED' }, { status: 503 });
  }
}
