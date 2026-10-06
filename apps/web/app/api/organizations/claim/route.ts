import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import { claimOrganization } from '../../../lib/organization-claims';
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
  const token =
    typeof body === 'object' && body !== null && 'token' in body
      ? (body as { token: unknown }).token
      : undefined;
  if (typeof token !== 'string' || token.length < 16 || token.length > 512)
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  try {
    const rateLimit = await enforceRateLimit(request, 'auth', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const result = await claimOrganization(actor.userId, token);
    if (result === null) return NextResponse.json({ error: 'INVALID_INVITE' }, { status: 404 });
    if (result === 'EMAIL_MISMATCH')
      return NextResponse.json({ error: 'EMAIL_MISMATCH' }, { status: 409 });
    return NextResponse.json({ claimed: true, slug: result.organizationSlug });
  } catch {
    return NextResponse.json({ error: 'CLAIM_FAILED' }, { status: 503 });
  }
}
