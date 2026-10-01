import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { dismissConnectionCooldown, getConnectionCooldown } from '../../../lib/social';

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const resetsAt = await getConnectionCooldown(actor.userId);
  return NextResponse.json({ resetsAt });
}

export async function DELETE(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  await dismissConnectionCooldown(actor.userId);
  return NextResponse.json({ dismissed: true });
}
