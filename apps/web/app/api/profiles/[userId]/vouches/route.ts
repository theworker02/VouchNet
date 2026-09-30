import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';
import { saveProfileVouch, VouchError, vouchKinds } from '../../../../lib/vouches';

const bodySchema = z.object({ kind: z.enum(vouchKinds) });

export async function POST(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const recipientId = z
      .string()
      .uuid()
      .parse((await context.params).userId);
    const { kind } = bodySchema.parse(await request.json());
    const vouch = await saveProfileVouch({ voucherId: actor.userId, recipientId, kind });
    return NextResponse.json({ vouch }, { status: 201 });
  } catch (error) {
    if (error instanceof VouchError)
      return NextResponse.json({ error: error.code }, { status: 403 });
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_VOUCH' : 'VOUCH_FAILED' },
      { status: 400 },
    );
  }
}
