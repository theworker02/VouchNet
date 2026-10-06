import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from './build-notifications';
import { actorFromRequest } from './identity';
import { hasSameOrigin } from './request-security';
import { enforceRateLimit } from './security/rate-limit';
import { rateLimitResponse } from './security/rate-limit-response';

/**
 * Shared guard for Build in Public writes: same-origin check, signed-in actor, the socialWrite
 * rate limit, and error mapping that never leaks internal messages.
 */
export async function guardedWrite(
  request: NextRequest,
  fallbackError: string,
  handler: (actor: { userId: string; sessionId: string }) => Promise<Response>,
): Promise<Response> {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    return await handler(actor);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    if (error instanceof DomainError)
      return NextResponse.json({ error: error.code }, { status: error.status });
    return NextResponse.json({ error: fallbackError }, { status: 500 });
  }
}

export const uuidParam = z.string().uuid();
