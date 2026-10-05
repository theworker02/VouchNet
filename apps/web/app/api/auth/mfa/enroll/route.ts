import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../../lib/identity';
import { beginMfaEnrollment, MfaError } from '../../../../lib/mfa';
import { hasSameOrigin } from '../../../../lib/request-security';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const rateLimit = await enforceRateLimit(request, 'auth', actor.userId);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  try {
    return NextResponse.json(await beginMfaEnrollment(actor.userId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof MfaError ? error.code : 'MFA_UNAVAILABLE' },
      { status: 400 },
    );
  }
}
