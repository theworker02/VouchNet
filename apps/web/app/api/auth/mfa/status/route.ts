import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../../lib/identity';
import { getMfaStatus } from '../../../../lib/mfa';

export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    return NextResponse.json(await getMfaStatus(actor.userId));
  } catch {
    return NextResponse.json({ error: 'MFA_UNAVAILABLE' }, { status: 503 });
  }
}
