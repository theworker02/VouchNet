import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../lib/identity';
import { hasSameOrigin } from '../../lib/request-security';
import { listSavedPosts, savePost } from '../../lib/saved-posts';
import { enforceRateLimit } from '../../lib/security/rate-limit';
import { rateLimitResponse } from '../../lib/security/rate-limit-response';

const saveSchema = z
  .object({
    postId: z.string().uuid(),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const posts = await listSavedPosts(actor.userId);
    return NextResponse.json({
      posts: posts.map((post) => ({
        ...post,
        createdAt: post.createdAt.toISOString(),
        savedAt: post.savedAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: 'SAVED_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const body = saveSchema.parse(await request.json());
    const result = await savePost(actor.userId, body.postId);
    return NextResponse.json({ saved: true, result });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'INVALID_SAVE' }, { status: 400 });
    if (error instanceof Error && error.message === 'POST_NOT_FOUND')
      return NextResponse.json({ error: 'POST_NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 400 });
  }
}
