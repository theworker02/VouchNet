import { NextRequest, NextResponse } from 'next/server';
import { desktopActorFromBearer } from '../../../lib/desktop-auth';
import { discoverPeople } from '../../../lib/discovery';
import { getNetworkOverview } from '../../../lib/social';

/**
 * Desktop network uses the device Bearer token so the Tauri client can load contacts,
 * pending invitations, and people recommendations without a browser session cookie.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const [overview, recommendations] = await Promise.all([
      getNetworkOverview(actor.userId),
      discoverPeople(actor.userId),
    ]);
    return NextResponse.json({
      overview,
      recommendations: recommendations.slice(0, 24).map((person) => ({
        userId: person.user_id,
        slug: person.slug,
        firstName: person.first_name,
        lastName: person.last_name,
        headline: person.headline,
        mutualContacts: person.mutual_contacts,
        score: person.score,
        reasons: person.reasons,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'NETWORK_UNAVAILABLE' }, { status: 503 });
  }
}
