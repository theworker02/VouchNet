import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';
import { createService, listProfileServices } from '../../../lib/profile-services';
import { serviceSchema } from '../../../lib/experience-schema';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json({ services: await listProfileServices(actor.userId, true) });
  } catch {
    return NextResponse.json({ error: 'DATABASE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  try {
    const input = serviceSchema.parse(await request.json());
    const service = await createService(actor.userId, input);
    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_SERVICE' : 'SERVICE_FAILED' },
      { status: 400 },
    );
  }
}
