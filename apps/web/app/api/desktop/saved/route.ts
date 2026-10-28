import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { desktopActorFromBearer } from '../../../lib/desktop-auth';
import { listSavedPosts, savePost, unsavePost } from '../../../lib/saved-posts';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

const saveSchema = z.object({ postId: z.string().uuid() }).strict();

/**
 * Desktop saved-posts inbox. Reads re-check visibility and block rules; writes use the device
 * Bearer token instead of cookie CSRF.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const posts = await listSavedPosts(actor.userId);
    return NextResponse.json({
      posts: posts.map((post) => ({
        id: post.id,
        authorName: post.authorName,
        authorSlug: post.authorSlug,
        authorHeadline: post.authorHeadline,
        bodyMarkdown: post.bodyMarkdown,
        category: post.category,
        peerSignal: post.peerSignal,
        commentCount: post.commentCount,
        createdAt: post.createdAt.toISOString(),
        savedAt: post.savedAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: 'SAVED_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
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

export async function DELETE(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const body = saveSchema.parse(await request.json());
    await unsavePost(actor.userId, body.postId);
    return NextResponse.json({ saved: false });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'INVALID_SAVE' }, { status: 400 });
    return NextResponse.json({ error: 'UNSAVE_FAILED' }, { status: 400 });
  }
}
