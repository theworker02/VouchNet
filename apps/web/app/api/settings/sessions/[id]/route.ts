import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest, revokeSession } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';
import { z } from 'zod';
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!hasSameOrigin(request))
      return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'auth', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const id = z
      .string()
      .uuid()
      .safeParse((await context.params).id);
    if (!id.success) return NextResponse.json({ error: 'INVALID_SESSION' }, { status: 400 });
    if (id.data === actor.sessionId)
      return NextResponse.json({ error: 'USE_LOGOUT_FOR_CURRENT_SESSION' }, { status: 400 });
    return (await revokeSession(actor.userId, id.data))
      ? NextResponse.json({ revoked: true })
      : NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
