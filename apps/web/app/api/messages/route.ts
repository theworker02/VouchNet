import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../lib/identity';
import { hasSameOrigin } from '../../lib/request-security';
import { enforceRateLimit } from '../../lib/security/rate-limit';
import { rateLimitResponse } from '../../lib/security/rate-limit-response';
import { listConversations, openDirectConversation } from '../../lib/messaging';

const openConversationSchema = z.object({ counterpartId: z.string().uuid() }).strict();

export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    return NextResponse.json({ conversations: await listConversations(actor.userId) });
  } catch {
    return NextResponse.json({ error: 'MESSAGES_UNAVAILABLE' }, { status: 503 });
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
    const input = openConversationSchema.parse(await request.json());
    return NextResponse.json(
      { conversation: await openDirectConversation(actor.userId, input.counterpartId) },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof z.ZodError ? 'INVALID_CONVERSATION' : 'CONVERSATION_CREATE_FAILED',
      },
      { status: 400 },
    );
  }
}
