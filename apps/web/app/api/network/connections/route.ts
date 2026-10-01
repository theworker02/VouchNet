import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import {
  ConnectionCooldownError,
  requestConnection,
  respondToConnection,
} from '../../../lib/social';
import { hasSameOrigin } from '../../../lib/request-security';
const requestSchema = z.object({ targetUserId: z.string().uuid() });
const responseSchema = z.object({
  connectionId: z.string().uuid(),
  action: z.enum(['accept', 'decline']),
});
export async function POST(request: NextRequest) {
  try {
    if (!hasSameOrigin(request))
      return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const body = await request.json();
    if ('targetUserId' in body) {
      await requestConnection(actor.userId, requestSchema.parse(body).targetUserId);
      return NextResponse.json({ state: 'PENDING' }, { status: 201 });
    }
    const data = responseSchema.parse(body);
    await respondToConnection(
      actor.userId,
      data.connectionId,
      data.action === 'accept' ? 'ACCEPTED' : 'DECLINED',
    );
    return NextResponse.json({ state: data.action === 'accept' ? 'ACCEPTED' : 'DECLINED' });
  } catch (error) {
    if (error instanceof ConnectionCooldownError)
      return NextResponse.json(
        { error: 'CONNECTION_COOLDOWN', resetsAt: error.resetsAt.toISOString() },
        { status: 429 },
      );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'CONNECTION_FAILED' },
      { status: 400 },
    );
  }
}
