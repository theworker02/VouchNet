import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest, revokeOtherSessions } from '../../../../lib/identity';
export async function POST(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    await revokeOtherSessions(actor.userId, actor.sessionId);
    return NextResponse.json({ revoked: true });
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
