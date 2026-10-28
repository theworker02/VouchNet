import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { unsavePost } from '../../../lib/saved-posts';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const { postId } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
      return NextResponse.json({ error: 'INVALID_POST' }, { status: 400 });
    }
    const removed = await unsavePost(actor.userId, postId);
    return NextResponse.json({ saved: false, removed });
  } catch {
    return NextResponse.json({ error: 'UNSAVE_FAILED' }, { status: 400 });
  }
}
