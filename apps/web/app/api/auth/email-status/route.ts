import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest, getPrimaryEmailStatus } from '../../../lib/identity';

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const email = await getPrimaryEmailStatus(actor.userId);
  if (email === null) return NextResponse.json({ error: 'EMAIL_UNAVAILABLE' }, { status: 404 });
  return NextResponse.json({ email: email.email, verifiedAt: email.verifiedAt });
}
