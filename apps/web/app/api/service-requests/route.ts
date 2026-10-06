import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../lib/identity';
import { hasSameOrigin } from '../../lib/request-security';
import { enforceRateLimit } from '../../lib/security/rate-limit';
import { rateLimitResponse } from '../../lib/security/rate-limit-response';
import { createServiceRequest, listServiceRequests } from '../../lib/profile-services';
import { serviceRequestSchema } from '../../lib/experience-schema';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const direction = request.nextUrl.searchParams.get('direction') === 'sent' ? 'sent' : 'received';
  try {
    return NextResponse.json({ requests: await listServiceRequests(actor.userId, direction) });
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
    const input = serviceRequestSchema.parse(await request.json());
    const created = await createServiceRequest(
      actor.userId,
      input.providerUserId,
      input.serviceId,
      input.message,
    );
    if (created === 'SELF') return NextResponse.json({ error: 'SELF_REQUEST' }, { status: 400 });
    if (created === null) return NextResponse.json({ error: 'INVALID_TARGET' }, { status: 404 });
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_REQUEST' : 'REQUEST_FAILED' },
      { status: 400 },
    );
  }
}
