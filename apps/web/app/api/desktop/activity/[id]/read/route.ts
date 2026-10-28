import { NextRequest, NextResponse } from 'next/server';
import { desktopActorFromBearer } from '../../../../../lib/desktop-auth';
import { markMemberNotificationRead } from '../../../../../lib/daily-strategy';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'INVALID_NOTIFICATION' }, { status: 400 });
    }
    const updated = await markMemberNotificationRead(actor.userId, id);
    return NextResponse.json({ updated });
  } catch {
    return NextResponse.json({ error: 'ACTIVITY_UNAVAILABLE' }, { status: 503 });
  }
}
