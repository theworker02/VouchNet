import { NextRequest, NextResponse } from 'next/server';
import { desktopActorFromBearer } from '../../../lib/desktop-auth';
import { getProfileSummary } from '../../../lib/identity';
import { publicVerificationBadge } from '../../../lib/identity-verification';
import { listProfileServices } from '../../../lib/profile-services';
import { hasVouchNetPlus } from '../../../lib/subscription';

export async function GET(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const [profile, verification, services, isPlus] = await Promise.all([
      getProfileSummary(actor.userId),
      publicVerificationBadge(actor.userId),
      listProfileServices(actor.userId, true).catch(() => []),
      hasVouchNetPlus(actor.userId),
    ]);
    return NextResponse.json({ profile, verification, services, membership: { isPlus } });
  } catch {
    return NextResponse.json({ error: 'DESKTOP_UNAVAILABLE' }, { status: 503 });
  }
}
