import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../lib/identity';
export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    return actor === null
      ? NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
      : NextResponse.json({ actorType: 'HUMAN', userId: actor.userId, sessionId: actor.sessionId });
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
