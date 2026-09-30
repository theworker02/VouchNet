import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';
import { reactionTypes, reactToPost } from '../../../../modules/posts/service';
const reactionSchema = z.object({ reactionType: z.enum(reactionTypes) });
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    await reactToPost(
      actor.userId,
      (await context.params).id,
      reactionSchema.parse(await request.json()).reactionType,
    );
    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_REACTION' : 'REACTION_FAILED' },
      { status: 400 },
    );
  }
}
