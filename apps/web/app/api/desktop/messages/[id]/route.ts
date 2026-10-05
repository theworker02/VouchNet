import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { desktopActorFromBearer } from '../../../../lib/desktop-auth';
import { getConversationMessages } from '../../../../lib/messaging';

const paramsSchema = z.object({ id: z.string().uuid() }).strict();

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const { id } = paramsSchema.parse(await context.params);
    return NextResponse.json({ messages: await getConversationMessages(actor.userId, id) });
  } catch {
    return NextResponse.json({ error: 'CONVERSATION_UNAVAILABLE' }, { status: 404 });
  }
}
