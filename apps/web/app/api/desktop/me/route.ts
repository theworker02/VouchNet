import { NextRequest, NextResponse } from 'next/server';
import { desktopActorFromBearer } from '../../../lib/desktop-auth';
import { getProfileSummary } from '../../../lib/identity';

export async function GET(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    return NextResponse.json({ profile: await getProfileSummary(actor.userId) });
  } catch {
    return NextResponse.json({ error: 'DESKTOP_UNAVAILABLE' }, { status: 503 });
  }
}
