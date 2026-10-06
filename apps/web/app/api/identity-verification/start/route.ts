import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import {
  startIdentityVerification,
  verificationProvider,
} from '../../../lib/identity-verification';
import { publicUrl } from '../../../lib/app-url';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  if (!verificationProvider().isConfigured())
    return NextResponse.json({ error: 'VERIFICATION_UNAVAILABLE' }, { status: 503 });
  try {
    const rateLimit = await enforceRateLimit(request, 'auth', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const session = await startIdentityVerification({
      userId: actor.userId,
      returnUrl: publicUrl('/settings/account?identity=returned', request.url).toString(),
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ALREADY_VERIFIED')
        return NextResponse.json({ error: 'ALREADY_VERIFIED' }, { status: 409 });
      if (error.message === 'VERIFICATION_RECENTLY_STARTED')
        return NextResponse.json({ error: 'COOLDOWN_ACTIVE' }, { status: 429 });
    }
    return NextResponse.json({ error: 'VERIFICATION_START_FAILED' }, { status: 503 });
  }
}
