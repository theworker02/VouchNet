import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import { follow, unfollow } from '../../../../lib/social';
import { hasSameOrigin } from '../../../../lib/request-security';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';
const routeParamsSchema = z.object({ userId: z.string().uuid() }).strict();
export async function POST(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    if (!hasSameOrigin(request))
      return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    await follow(actor.userId, routeParamsSchema.parse(await context.params).userId);
    return NextResponse.json({ following: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'FOLLOW_FAILED' },
      { status: 400 },
    );
  }
}
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    if (!hasSameOrigin(request))
      return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    await unfollow(actor.userId, routeParamsSchema.parse(await context.params).userId);
    return NextResponse.json({ following: false });
  } catch {
    return NextResponse.json({ error: 'UNFOLLOW_FAILED' }, { status: 400 });
  }
}
