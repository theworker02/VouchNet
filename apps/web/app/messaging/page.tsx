import { Shell } from '../components/shell';
import { getCurrentActor } from '../lib/identity';
import { listConversations } from '../lib/messaging';
import { MessagingClient } from './messaging-client';

export default async function MessagingPage() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  const conversations = await listConversations(actor.userId);
  return (
    <Shell>
      <MessagingClient currentUserId={actor.userId} initialConversations={conversations} />
    </Shell>
  );
}
