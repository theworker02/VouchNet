import { Shell } from '../components/shell';
import { FeedClient } from '../modules/posts/feed-client';

export default function FeedPage() {
  return (
    <Shell>
      <FeedClient />
    </Shell>
  );
}
