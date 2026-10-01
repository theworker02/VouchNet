import { NextRequest, NextResponse } from 'next/server';
import { markMemberNotificationRead } from '../../../../lib/daily-strategy';
import { actorFromRequest } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))
    return NextResponse.json({ error: 'INVALID_NOTIFICATION' }, { status: 400 });
  const updated = await markMemberNotificationRead(actor.userId, id);
  return NextResponse.json({ updated });
}
