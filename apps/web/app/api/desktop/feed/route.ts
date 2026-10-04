import { NextRequest, NextResponse } from 'next/server';
import { desktopActorFromBearer } from '../../../lib/desktop-auth';
import { getFeedDiscovery } from '../../../lib/feed-discovery';
import { getFeed } from '../../../modules/posts/service';

export async function GET(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const [posts, discovery] = await Promise.all([
      getFeed(actor.userId, 'CHRONOLOGICAL', []),
      getFeedDiscovery(),
    ]);
    return NextResponse.json({ posts, discovery });
  } catch {
    return NextResponse.json({ error: 'FEED_UNAVAILABLE' }, { status: 503 });
  }
}
