import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';
import { deleteService, updateService } from '../../../../lib/profile-services';
import { serviceSchema } from '../../../../lib/experience-schema';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  try {
    const input = serviceSchema.parse(await request.json());
    const service = await updateService(actor.userId, (await params).id, input);
    if (service === null) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ service });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_SERVICE' : 'SERVICE_FAILED' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  const deleted = await deleteService(actor.userId, (await params).id).catch(() => false);
  return deleted
    ? NextResponse.json({ deleted: true })
    : NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
}
