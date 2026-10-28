import { NextRequest, NextResponse } from 'next/server';
import { markAllMemberNotificationsRead } from '../../../lib/daily-strategy';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const updated = await markAllMemberNotificationsRead(actor.userId);
    return NextResponse.json({ updated });
  } catch {
    return NextResponse.json({ error: 'NOTIFICATIONS_UNAVAILABLE' }, { status: 503 });
  }
}
