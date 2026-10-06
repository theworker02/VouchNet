import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../lib/identity';
import { latestVerification } from '../../lib/identity-verification';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json({ verification: await latestVerification(actor.userId) });
  } catch {
    return NextResponse.json({ error: 'VERIFICATION_UNAVAILABLE' }, { status: 503 });
  }
}
