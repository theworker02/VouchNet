import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationLinkEmail } from '../../../lib/email';
import { actorFromRequest, beginEmailVerificationLink, IdentityError } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const rateLimit = await enforceRateLimit(request, 'auth', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const verification = await beginEmailVerificationLink(actor.userId);
    await sendVerificationLinkEmail(verification);
    return NextResponse.json({ sent: true, cooldownSeconds: 60 });
  } catch (error) {
    if (error instanceof IdentityError) {
      if (error.code === 'VERIFICATION_RECENTLY_SENT')
        return NextResponse.json({ error: 'COOLDOWN_ACTIVE' }, { status: 429 });
      if (error.code === 'ACCOUNT_ALREADY_ACTIVE')
        return NextResponse.json({ error: 'EMAIL_ALREADY_VERIFIED' }, { status: 409 });
    }
    return NextResponse.json({ error: 'VERIFICATION_SEND_FAILED' }, { status: 503 });
  }
}
