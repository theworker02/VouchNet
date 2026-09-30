import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../../lib/identity';
import { block } from '../../../../lib/social';
import { hasSameOrigin } from '../../../../lib/request-security';
export async function POST(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    if (!hasSameOrigin(request))
      return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    await block(actor.userId, (await context.params).userId);
    return NextResponse.json({ blocked: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'BLOCK_FAILED' },
      { status: 400 },
    );
  }
}
