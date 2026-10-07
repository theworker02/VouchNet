import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../../../../lib/identity';
import { hasSameOrigin } from '../../../../../../lib/request-security';
import { toggleCommentReaction } from '../../../../../../modules/posts/service';
import { enforceRateLimit } from '../../../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../../../lib/security/rate-limit-response';

type Context = { params: Promise<{ id: string; commentId: string }> };

export async function POST(request: NextRequest, context: Context) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const status = await toggleCommentReaction((await context.params).commentId, actor.userId);
    return NextResponse.json({ status });
  } catch {
    return NextResponse.json({ error: 'REACTION_FAILED' }, { status: 400 });
  }
}
