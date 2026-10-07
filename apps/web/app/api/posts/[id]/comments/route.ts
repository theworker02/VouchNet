import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';
import { addPostComment, listPostComments } from '../../../../modules/posts/service';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';

const commentSchema = z
  .object({
    bodyMarkdown: z.string().trim().min(1).max(4000),
    parentCommentId: z.string().uuid().nullish(),
  })
  .strict();

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const comments = await listPostComments((await context.params).id, actor.userId);
    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ error: 'COMMENTS_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(request: NextRequest, context: Context) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const input = commentSchema.parse(await request.json());
    const comment = await addPostComment(
      (await context.params).id,
      actor.userId,
      input.bodyMarkdown,
      input.parentCommentId ?? null,
    );
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_COMMENT' : 'COMMENT_FAILED' },
      { status: 400 },
    );
  }
}
