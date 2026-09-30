import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest, revokeSession } from '../../../../lib/identity';
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const { id } = await context.params;
    if (id === actor.sessionId)
      return NextResponse.json({ error: 'USE_LOGOUT_FOR_CURRENT_SESSION' }, { status: 400 });
    return (await revokeSession(actor.userId, id))
      ? NextResponse.json({ revoked: true })
      : NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
