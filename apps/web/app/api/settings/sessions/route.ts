import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest, listSessions } from '../../../lib/identity';
export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const sessions = await listSessions(actor.userId);
    return NextResponse.json({
      sessions: sessions.map((session) => ({
        ...session,
        current: session.id === actor.sessionId,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
