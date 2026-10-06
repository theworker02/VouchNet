import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';
import { updateServiceRequestStatus } from '../../../lib/profile-services';

export const runtime = 'nodejs';

const statusSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED', 'WITHDRAWN']),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  try {
    const { status } = statusSchema.parse(await request.json());
    const updated = await updateServiceRequestStatus(actor.userId, (await params).id, status);
    return updated
      ? NextResponse.json({ updated: true })
      : NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_STATUS' : 'UPDATE_FAILED' },
      { status: 400 },
    );
  }
}
