import { NextRequest, NextResponse } from 'next/server';
import { desktopActorFromBearer } from '../../../lib/desktop-auth';
import { listConversations } from '../../../lib/messaging';

/**
 * Desktop uses a device access token instead of a browser cookie.  Keep this
 * narrow endpoint separate from the browser route so a Tauri client never has
 * to impersonate a web session.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    return NextResponse.json({ conversations: await listConversations(actor.userId) });
  } catch {
    return NextResponse.json({ error: 'MESSAGES_UNAVAILABLE' }, { status: 503 });
  }
}
