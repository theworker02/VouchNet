import { Shell } from '../components/shell';
import { getCurrentActor } from '../lib/identity';
import { listSavedPosts } from '../lib/saved-posts';
import { SavedClient } from './saved-client';

export const dynamic = 'force-dynamic';

export default async function SavedPage() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  const posts = await listSavedPosts(actor.userId);
  return (
    <Shell>
      <SavedClient
        initialPosts={posts.map((post) => ({
          ...post,
          createdAt: post.createdAt.toISOString(),
          savedAt: post.savedAt.toISOString(),
        }))}
      />
    </Shell>
  );
}
