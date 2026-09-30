import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../lib/identity';
import { getFeed, postCategories } from '../../modules/posts/service';

const feedQuerySchema = z.object({
  mode: z.enum(['CHRONOLOGICAL', 'PEER_VERIFIED']).default('CHRONOLOGICAL'),
  hide: z.array(z.enum(postCategories)).default([]),
});
export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const query = feedQuerySchema.parse({
      mode: request.nextUrl.searchParams.get('mode') ?? undefined,
      hide: request.nextUrl.searchParams.getAll('hide'),
    });
    return NextResponse.json({ posts: await getFeed(actor.userId, query.mode, query.hide) });
  } catch {
    return NextResponse.json({ error: 'FEED_UNAVAILABLE' }, { status: 503 });
  }
}
