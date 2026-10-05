import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import { confirmMfaEnrollment, MfaError } from '../../../../lib/mfa';
import { hasSameOrigin } from '../../../../lib/request-security';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/),
  })
  .strict();

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const rateLimit = await enforceRateLimit(request, 'auth', actor.userId);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  try {
    return NextResponse.json(
      await confirmMfaEnrollment(actor.userId, schema.parse(await request.json()).code),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof MfaError ? error.code : 'MFA_CONFIRM_FAILED' },
      { status: 400 },
    );
  }
}
