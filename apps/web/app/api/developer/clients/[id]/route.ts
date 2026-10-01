import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revokeDeveloperClient } from '../../../../lib/apply-oauth';
import { actorFromRequest } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';
import { recordSecurityAuditEvent } from '../../../../lib/security/audit';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const rateLimit = await enforceRateLimit(request, 'auth', actor.userId);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  const clientId = z
    .string()
    .uuid()
    .safeParse((await context.params).id);
  if (!clientId.success) return NextResponse.json({ error: 'INVALID_CLIENT' }, { status: 400 });
  const revoked = await revokeDeveloperClient(actor.userId, clientId.data);
  if (revoked)
    await recordSecurityAuditEvent({
      request,
      action: 'OAUTH_APP_REVOKED',
      status: 'SUCCESS',
      actorId: actor.userId,
      sessionId: actor.sessionId,
    });
  return NextResponse.json({ revoked }, { status: revoked ? 200 : 404 });
}
