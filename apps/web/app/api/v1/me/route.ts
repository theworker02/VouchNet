import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest, getProfileSummary } from '../../../lib/identity';
import { getUserSettings } from '../../../lib/settings';

/** Versioned authenticated member read model. It returns only the requesting member's data. */
export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const [profile, settings] = await Promise.all([
      getProfileSummary(actor.userId),
      getUserSettings(actor.userId),
    ]);
    return NextResponse.json(
      {
        actor: { type: 'HUMAN', userId: actor.userId, sessionId: actor.sessionId },
        profile,
        settings,
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
