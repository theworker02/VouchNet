import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { getConversationMessages, setConversationMuted } from '../../../lib/messaging';

const paramsSchema = z.object({ id: z.string().uuid() }).strict();
const muteSchema = z.object({ muted: z.boolean() }).strict();

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await actorFromRequest(_request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const { id } = paramsSchema.parse(await context.params);
    return NextResponse.json({ messages: await getConversationMessages(actor.userId, id) });
  } catch {
    return NextResponse.json({ error: 'CONVERSATION_UNAVAILABLE' }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const { id } = paramsSchema.parse(await context.params);
    const { muted } = muteSchema.parse(await request.json());
    await setConversationMuted(actor.userId, id, muted);
    return NextResponse.json({ muted });
  } catch {
    return NextResponse.json({ error: 'CONVERSATION_UPDATE_FAILED' }, { status: 400 });
  }
}
